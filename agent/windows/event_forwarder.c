/*
 * Event Forwarding Aggregator - Windows Agent
 * TechvSOC XDR Platform
 *
 * Native Windows event log forwarding agent using wevtapi.
 * Monitors Palantir WEF-recommended channels for intrusion detection.
 * Forwards events via raw TCP socket (syslog RFC 5424).
 * Minimal system tray interface.
 */

#pragma comment(lib, "wevtapi.lib")
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "comctl32.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "shell32.lib")

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <shellapi.h>
#include <winevt.h>
#include <strsafe.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "resource.h"

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

#define WM_TRAYICON         (WM_USER + 1)
#define IDM_SHOW_STATUS     1001
#define IDM_RESTART         1002
#define IDM_EXIT            1003

#define IDT_STATUS_TIMER    2001
#define IDT_RECONNECT_TIMER 2002

#define MAX_SYSLOG_MSG      65536
#define MAX_EVENT_XML       32768
#define MAX_PATH_LEN        260
#define MAX_HOST_LEN        256
#define MAX_PORT_LEN        8
#define MAX_CHANNELS        32
#define RECONNECT_INTERVAL  5000   /* ms */
#define STATUS_INTERVAL     1000   /* ms */

#define APP_NAME            L"TechvSOC Event Forwarder"
#define APP_CLASS           L"TechvSOCEventForwarder"
#define INI_FILENAME        L"event_forwarder.ini"
#define BOOKMARK_FILENAME   L"event_forwarder.bm"

/* ------------------------------------------------------------------ */
/*  All monitored channels (Genral SOC + Palantir WEF comprehensive)       */
/*  Covers: Security, System, Application, Sysmon, PowerShell,        */
/*  Defender, McAfee, Terminal Services, Remote Access, DNS,          */
/*  TaskScheduler, BITS, Firewall, WMI, Print, DNS Client,            */
/*  Kernel, BitLocker, Code Integrity, LSA, Audit, SMB, DHCP,        */
/*  NTLM, Kerberos, Windows Update, RemoteDesktop, WinRM              */
/* ------------------------------------------------------------------ */

typedef struct _CHANNEL_ENTRY {
    const WCHAR* name;        /* event channel path                       */
    const WCHAR* query;       /* XPath query (NULL = "*")                 */
    const WCHAR* provider;    /* provider name for identification         */
    const WCHAR* category;    /* human-readable category for status       */
} CHANNEL_ENTRY;

static const CHANNEL_ENTRY g_channel_entries[MAX_CHANNELS] = {
    /* -- Core Windows Administrative Channels -- */
    { L"Security",            NULL, NULL, L"Security" },
    { L"System",              NULL, NULL, L"System" },
    { L"Application",         NULL, NULL, L"Application" },

    /* -- Sysmon (process, network, file, registry, image load) -- */
    { L"Microsoft-Windows-Sysmon/Operational",
      NULL,
      L"Microsoft-Windows-Sysmon",
      L"Sysmon" },

    /* -- PowerShell (script block, module, console logging) -- */
    { L"Microsoft-Windows-PowerShell/Operational",
      NULL,
      L"Microsoft-Windows-PowerShell",
      L"PowerShell" },

    /* -- Windows Defender (malware detection, scans, remediation) -- */
    { L"Microsoft-Windows-Windows Defender/Operational",
      NULL,
      L"Microsoft-Windows-Windows Defender",
      L"Windows Defender" },

    /* -- Terminal Services / RDP -- */
    { L"Microsoft-Windows-TerminalServices-LocalSessionManager/Operational",
      NULL,
      L"Microsoft-Windows-TerminalServices-LocalSessionManager",
      L"Terminal Services - Local Session" },
    { L"Microsoft-Windows-TerminalServices-RemoteConnectionManager/Operational",
      NULL,
      L"Microsoft-Windows-TerminalServices-RemoteConnectionManager",
      L"Terminal Services - Remote Connection" },
    { L"Microsoft-Windows-RemoteDesktopServices-RdpCoreTS/Operational",
      NULL,
      L"Microsoft-Windows-RemoteDesktopServices-RdpCoreTS",
      L"RDP Core" },

    /* -- Task Scheduler -- */
    { L"Microsoft-Windows-TaskScheduler/Operational",
      NULL, NULL, L"Task Scheduler" },

    /* -- Windows Firewall -- */
    { L"Microsoft-Windows-Windows Firewall With Advanced Security/Firewall",
      NULL, NULL, L"Windows Firewall" },

    /* -- BITS (Background Intelligent Transfer Service) -- */
    { L"Microsoft-Windows-Bits-Client/Operational",
      NULL, NULL, L"BITS Client" },

    /* -- WMI Activity -- */
    { L"Microsoft-Windows-WMI-Activity/Operational",
      NULL,
      L"Microsoft-Windows-WMI-Activity",
      L"WMI Activity" },

    /* -- DNS Client -- */
    { L"Microsoft-Windows-DNS-Client/Operational",
      NULL, NULL, L"DNS Client" },

    /* -- Print Service (document audit) -- */
    { L"Microsoft-Windows-PrintService/Operational",
      NULL,
      L"Microsoft-Windows-PrintService",
      L"Print Service" },

    /* -- Code Integrity (driver/module signing) -- */
    { L"Microsoft-Windows-CodeIntegrity/Operational",
      NULL, NULL, L"Code Integrity" },

    /* -- BitLocker Drive Encryption -- */
    { L"Microsoft-Windows-BitLocker/BitLocker Management",
      NULL, NULL, L"BitLocker" },

    /* -- LSA (Lsass.exe authentication) -- */
    { L"Microsoft-Windows-LsaSrv/Operational",
      NULL, NULL, L"LSA" },

    /* -- Security Audit (audit policy changes) -- */
    { L"Microsoft-Windows-Security-Auditing",
      NULL, NULL, L"Security Auditing" },

    /* -- SMB Client / Server -- */
    { L"Microsoft-Windows-SmbClient/Operational",
      NULL, NULL, L"SMB Client" },
    { L"Microsoft-Windows-SmbServer/Operational",
      NULL, NULL, L"SMB Server" },

    /* -- DHCP Client -- */
    { L"Microsoft-Windows-Dhcp-Client/Operational",
      NULL, NULL, L"DHCP Client" },

    /* -- NTLM (authentication audit) -- */
    { L"Microsoft-Windows-NTLM/Operational",
      NULL, NULL, L"NTLM" },

    /* -- Kerberos (ticket audit) -- */
    { L"Microsoft-Windows-Kerberos/Operational",
      NULL, NULL, L"Kerberos" },

    /* -- Windows Update -- */
    { L"Microsoft-Windows-WindowsUpdateClient/Operational",
      NULL, NULL, L"Windows Update" },

    /* -- WinRM (remote management) -- */
    { L"Microsoft-Windows-WinRM/Operational",
      NULL, NULL, L"WinRM" },

    /* -- Remote Access / VPN -- */
    { L"Microsoft-Windows-RemoteAccess/Operational",
      NULL, NULL, L"Remote Access" },

    /* -- Kernel (general system events) -- */
    { L"Microsoft-Windows-Kernel-General/Operational",
      NULL, NULL, L"Kernel General" },

    /* -- File Replication Service (NTFRS) -- */
    { L"Microsoft-Windows-FileReplicationService/Operational",
      NULL, NULL, L"File Replication" },

    /* -- McAfee (via Application log + McLogEvent provider) -- */
    { L"Application",
      L"Event/System[Provider[@Name='McLogEvent']]",
      L"McLogEvent",
      L"McAfee" },

    /* -- Microsoft Antimalware (Security Essentials) -- */
    { L"System",
      L"Event/System[Provider[@Name='Microsoft Antimalware']]",
      L"Microsoft Antimalware",
      L"Microsoft Antimalware" },

    /* -- EventLog source within System channel -- */
    { L"System",
      L"Event/System[Provider[@Name='Eventlog']]",
      L"Eventlog",
      L"EventLog Source" },
};

#define CHANNEL_COUNT (sizeof(g_channel_entries) / sizeof(g_channel_entries[0]))

/* ------------------------------------------------------------------ */
/*  Key Security Event IDs                                            */
/* ------------------------------------------------------------------ */

static const DWORD g_key_event_ids[] = {
    4624, 4625, 4634, 4648, 4672, 4688, 4697, 4702,
    4720, 4732, 4740, 4756, 4767, 4768, 4769, 4771,
    4776, 5136, 5140, 5142, 5145, 7034, 7036, 7045
};
#define KEY_EVENT_COUNT (sizeof(g_key_event_ids) / sizeof(g_key_event_ids[0]))

/* ------------------------------------------------------------------ */
/*  Data types                                                        */
/* ------------------------------------------------------------------ */

/* Linked-list node for the event queue */
typedef struct _EVENT_NODE {
    char*               syslog_msg;     /* RFC 5424 formatted message    */
    size_t              msg_len;
    struct _EVENT_NODE* next;
} EVENT_NODE;

/* Per-subscription bookmark state */
typedef struct _CHANNEL_BOOKMARK {
    const WCHAR*        channel;
    EVT_HANDLE          bookmark;
} CHANNEL_BOOKMARK;

/* Global application state */
typedef struct _APP_STATE {
    /* Configuration */
    char                syslog_host[MAX_HOST_LEN];
    char                syslog_port[MAX_PORT_LEN];
    WCHAR               ini_path[MAX_PATH];
    WCHAR               bookmark_path[MAX_PATH];

    /* Networking */
    SOCKET              sock;
    BOOL                connected;
    WSADATA             wsa_data;

    /* Event queue */
    CRITICAL_SECTION    queue_lock;
    EVENT_NODE*         queue_head;
    EVENT_NODE*         queue_tail;
    HANDLE              queue_event;        /* manual-reset event */

    /* Threading */
    HANDLE              worker_thread;
    volatile LONG       shutdown;

    /* Subscriptions */
    EVT_HANDLE          subscriptions[MAX_CHANNELS];
    CHANNEL_BOOKMARK    bookmarks[MAX_CHANNELS];
    int                 sub_count;
    BOOL                channel_active[MAX_CHANNELS]; /* which channels successfully subscribed */

    /* Statistics */
    volatile LONG64     events_collected;
    DWORD               start_tick;

    /* Windowing */
    HWND                msg_window;
    NOTIFYICONDATAW     nid;
    HMENU               tray_menu;
    HWND                status_dialog;
} APP_STATE;

static APP_STATE g_state;

/* ------------------------------------------------------------------ */
/*  Forward declarations                                              */
/* ------------------------------------------------------------------ */

static BOOL     LoadConfiguration(void);
static BOOL     SaveBookmarks(void);
static BOOL     LoadBookmarks(void);
static BOOL     ConnectSyslog(void);
static void     DisconnectSyslog(void);
static BOOL     StartSubscriptions(void);
static void     StopSubscriptions(void);
static BOOL     EnqueueEvent(const char* msg, size_t len);
static DWORD WINAPI WorkerThread(LPVOID param);
static void     FormatSyslogMessage(char* buf, size_t bufsz,
                                     const char* hostname,
                                     const char* xml);
static BOOL     IsKeyEventId(DWORD event_id);
static char*    WideToUtf8Alloc(const WCHAR* wide);
static BOOL     GetLocalHostname(char* buf, size_t bufsz);

/* Window / tray */
static BOOL     RegisterWindowClass(HINSTANCE inst);
static BOOL     CreateMessageWindow(HINSTANCE inst);
static BOOL     AddTrayIcon(void);
static void     RemoveTrayIcon(void);
static void     ShowContextMenu(HWND hwnd);
static void     ShowNotification(DWORD icon_type, const WCHAR* title, const WCHAR* text);
static INT_PTR CALLBACK StatusDlgProc(HWND hdlg, UINT msg,
                                       WPARAM wp, LPARAM lp);

/* EvtSubscribe callback */
static DWORD WINAPI EventCallback(EVT_SUBSCRIBE_NOTIFY_ACTION action,
                                   PVOID context, EVT_HANDLE event);

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                   */
/* ------------------------------------------------------------------ */

static char* WideToUtf8Alloc(const WCHAR* wide)
{
    if (!wide) return NULL;
    int len = WideCharToMultiByte(CP_UTF8, 0, wide, -1, NULL, 0, NULL, NULL);
    if (len <= 0) return NULL;
    char* utf8 = (char*)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, (size_t)len);
    if (!utf8) return NULL;
    WideCharToMultiByte(CP_UTF8, 0, wide, -1, utf8, len, NULL, NULL);
    return utf8;
}

static WCHAR* Utf8ToWideAlloc(const char* utf8)
{
    if (!utf8) return NULL;
    int len = MultiByteToWideChar(CP_UTF8, 0, utf8, -1, NULL, 0);
    if (len <= 0) return NULL;
    WCHAR* wide = (WCHAR*)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY,
                                     (size_t)len * sizeof(WCHAR));
    if (!wide) return NULL;
    MultiByteToWideChar(CP_UTF8, 0, utf8, -1, wide, len);
    return wide;
}

static BOOL GetLocalHostname(char* buf, size_t bufsz)
{
    WCHAR whost[MAX_COMPUTERNAME_LENGTH + 1];
    DWORD size = MAX_COMPUTERNAME_LENGTH + 1;
    if (!GetComputerNameW(whost, &size)) {
        StringCchCopyA(buf, bufsz, "unknown");
        return FALSE;
    }
    WideCharToMultiByte(CP_UTF8, 0, whost, -1, buf, (int)bufsz, NULL, NULL);
    return TRUE;
}

static BOOL IsKeyEventId(DWORD event_id)
{
    for (int i = 0; i < (int)KEY_EVENT_COUNT; i++) {
        if (g_key_event_ids[i] == event_id)
            return TRUE;
    }
    return FALSE;
}

/* Read a string value from the INI file */
static void GetIniString(const WCHAR* section, const WCHAR* key,
                          const WCHAR* defval, WCHAR* buf, DWORD bufsz)
{
    GetPrivateProfileStringW(section, key, defval, buf, bufsz, g_state.ini_path);
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

static BOOL LoadConfiguration(void)
{
    /* Build path to INI in same directory as EXE */
    WCHAR exe_path[MAX_PATH];
    GetModuleFileNameW(NULL, exe_path, MAX_PATH);

    /* Find last backslash */
    WCHAR* slash = wcsrchr(exe_path, L'\\');
    if (!slash) {
        return FALSE;
    }
    *(slash + 1) = L'\0';

    StringCchCopyW(g_state.ini_path, MAX_PATH, exe_path);
    StringCchCatW(g_state.ini_path, MAX_PATH, INI_FILENAME);

    StringCchCopyW(g_state.bookmark_path, MAX_PATH, exe_path);
    StringCchCatW(g_state.bookmark_path, MAX_PATH, BOOKMARK_FILENAME);

    /* Read settings */
    WCHAR whost[MAX_HOST_LEN];
    WCHAR wport[MAX_PORT_LEN];

    GetIniString(L"syslog", L"host", L"127.0.0.1", whost, MAX_HOST_LEN);
    GetIniString(L"syslog", L"port", L"514", wport, MAX_PORT_LEN);

    /* Convert to UTF-8 for socket operations */
    WideCharToMultiByte(CP_UTF8, 0, whost, -1,
                        g_state.syslog_host, MAX_HOST_LEN, NULL, NULL);
    WideCharToMultiByte(CP_UTF8, 0, wport, -1,
                        g_state.syslog_port, MAX_PORT_LEN, NULL, NULL);

    return TRUE;
}

/* ------------------------------------------------------------------ */
/*  Bookmark persistence                                              */
/* ------------------------------------------------------------------ */

static BOOL SaveBookmarks(void)
{
    /*
     * Save each channel bookmark XML to the bookmark file.
     * Format: [channel_name_xml] key=bookmark_xml
     * We store the bookmark XML returned by EvtRender for each channel.
     */
    for (int i = 0; i < g_state.sub_count; i++) {
        if (!g_state.bookmarks[i].bookmark)
            continue;

        /* Render bookmark to XML */
        DWORD prop_count = 0;
        DWORD buffer_size = 0;
        /* Render the bookmark as XML string */
        if (!EvtRender(NULL, g_state.bookmarks[i].bookmark,
                        EvtRenderBookmark, 0, NULL,
                        &buffer_size, &prop_count)) {
            if (GetLastError() != ERROR_INSUFFICIENT_BUFFER)
                continue;
        }

        WCHAR* bm_xml = (WCHAR*)HeapAlloc(GetProcessHeap(),
                                            HEAP_ZERO_MEMORY, buffer_size);
        if (!bm_xml) continue;

        if (!EvtRender(NULL, g_state.bookmarks[i].bookmark,
                        EvtRenderBookmark, buffer_size, bm_xml,
                        &buffer_size, &prop_count)) {
            HeapFree(GetProcessHeap(), 0, bm_xml);
            continue;
        }

        /* Escape: convert bookmark XML to a single line for INI storage */
        WritePrivateProfileStringW(g_state.bookmarks[i].channel,
                                    L"bookmark",
                                    bm_xml,
                                    g_state.bookmark_path);
        HeapFree(GetProcessHeap(), 0, bm_xml);
    }
    return TRUE;
}

static BOOL LoadBookmarks(void)
{
    for (int i = 0; i < CHANNEL_COUNT; i++) {
        WCHAR bm_xml[MAX_PATH * 4] = { 0 };
        GetPrivateProfileStringW(g_channel_entries[i].name, L"bookmark", L"",
                                  bm_xml, MAX_PATH * 4,
                                  g_state.bookmark_path);

        if (wcslen(bm_xml) > 0) {
            g_state.bookmarks[i].bookmark = EvtCreateBookmark(bm_xml);
            if (!g_state.bookmarks[i].bookmark) {
                /* If bookmark is stale/invalid, start fresh */
                g_state.bookmarks[i].bookmark = NULL;
            }
        }
        g_state.bookmarks[i].channel = g_channel_entries[i].name;
    }
    return TRUE;
}

/* ------------------------------------------------------------------ */
/*  TCP / Syslog networking                                           */
/* ------------------------------------------------------------------ */

static BOOL InitializeWinsock(void)
{
    int rc = WSAStartup(MAKEWORD(2, 2), &g_state.wsa_data);
    if (rc != 0) {
        return FALSE;
    }
    return TRUE;
}

static void CleanupWinsock(void)
{
    WSACleanup();
}

static BOOL ConnectSyslog(void)
{
    if (g_state.connected) {
        return TRUE;
    }

    struct addrinfo hints, *result = NULL;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_protocol = IPPROTO_TCP;

    int rc = getaddrinfo(g_state.syslog_host, g_state.syslog_port,
                         &hints, &result);
    if (rc != 0) {
        return FALSE;
    }

    g_state.sock = socket(result->ai_family, result->ai_socktype,
                          result->ai_protocol);
    if (g_state.sock == INVALID_SOCKET) {
        freeaddrinfo(result);
        return FALSE;
    }

    /* Set a 10-second send timeout */
    DWORD timeout = 10000;
    setsockopt(g_state.sock, SOL_SOCKET, SO_SNDTIMEO,
               (const char*)&timeout, sizeof(timeout));

    /* Set TCP_NODELAY for low-latency forwarding */
    int nodelay = 1;
    setsockopt(g_state.sock, IPPROTO_TCP, TCP_NODELAY,
               (const char*)&nodelay, sizeof(nodelay));

    if (connect(g_state.sock, result->ai_addr, (int)result->ai_addrlen)
        == SOCKET_ERROR) {
        closesocket(g_state.sock);
        g_state.sock = INVALID_SOCKET;
        freeaddrinfo(result);
        return FALSE;
    }

    freeaddrinfo(result);
    g_state.connected = TRUE;
    return TRUE;
}

static void DisconnectSyslog(void)
{
    if (g_state.sock != INVALID_SOCKET) {
        shutdown(g_state.sock, SD_BOTH);
        closesocket(g_state.sock);
        g_state.sock = INVALID_SOCKET;
    }
    g_state.connected = FALSE;
}

static BOOL SendAll(const char* data, size_t len)
{
    size_t total_sent = 0;
    while (total_sent < len) {
        int sent = send(g_state.sock, data + total_sent,
                        (int)(len - total_sent), 0);
        if (sent == SOCKET_ERROR) {
            return FALSE;
        }
        total_sent += (size_t)sent;
    }
    return TRUE;
}

/* ------------------------------------------------------------------ */
/*  Syslog RFC 5424 formatting                                        */
/* ------------------------------------------------------------------ */

/*
 * RFC 5424 format:
 *   <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID SD MSG
 *
 * Example:
 *   <165>1 2024-01-15T12:34:56.000Z myhost WEF 1234 - [wef meta] message
 *
 * We embed the Windows event XML as the message body.
 */
static void FormatSyslogMessage(char* buf, size_t bufsz,
                                 const char* hostname,
                                 const char* xml)
{
    /* PRI = facility(local0=128) + severity(info=6) = 134 */
    int pri = 134;
    const char* version = "1";

    /* Timestamp in ISO 8601 */
    SYSTEMTIME st;
    GetSystemTime(&st);

    char timestamp[64];
    StringCchPrintfA(timestamp, sizeof(timestamp),
        "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
        st.wYear, st.wMonth, st.wDay,
        st.wHour, st.wMinute, st.wSecond, st.wMilliseconds);

    /*
     * We replace any newlines in XML with spaces to keep the syslog
     * message on one line.
     */
    char* clean_xml = (char*)HeapAlloc(GetProcessHeap(), 0,
                                        strlen(xml) + 1);
    if (clean_xml) {
        size_t i = 0;
        const char* p = xml;
        while (*p) {
            if (*p == '\r' || *p == '\n') {
                clean_xml[i++] = ' ';
                p++;
                /* skip consecutive whitespace */
                while (*p == '\r' || *p == '\n' || *p == ' ' || *p == '\t')
                    p++;
            } else {
                clean_xml[i++] = *p++;
            }
        }
        clean_xml[i] = '\0';
    } else {
        clean_xml = (char*)xml;  /* fallback, not ideal */
    }

    StringCchPrintfA(buf, bufsz,
        "<%d>%s %s %s WEF %lu - %s",
        pri, version, timestamp,
        hostname ? hostname : "-",
        GetCurrentProcessId(),
        clean_xml);

    if (clean_xml != xml && clean_xml) {
        HeapFree(GetProcessHeap(), 0, clean_xml);
    }
}

/* ------------------------------------------------------------------ */
/*  Event queue (thread-safe linked list)                             */
/* ------------------------------------------------------------------ */

static BOOL EnqueueEvent(const char* msg, size_t len)
{
    EVENT_NODE* node = (EVENT_NODE*)HeapAlloc(GetProcessHeap(),
                                               HEAP_ZERO_MEMORY,
                                               sizeof(EVENT_NODE));
    if (!node) return FALSE;

    node->syslog_msg = (char*)HeapAlloc(GetProcessHeap(), 0, len + 1);
    if (!node->syslog_msg) {
        HeapFree(GetProcessHeap(), 0, node);
        return FALSE;
    }
    memcpy(node->syslog_msg, msg, len);
    node->syslog_msg[len] = '\0';
    node->msg_len = len;
    node->next = NULL;

    EnterCriticalSection(&g_state.queue_lock);

    if (g_state.queue_tail) {
        g_state.queue_tail->next = node;
    } else {
        g_state.queue_head = node;
    }
    g_state.queue_tail = node;

    LeaveCriticalSection(&g_state.queue_lock);

    /* Signal worker thread that an event is available */
    SetEvent(g_state.queue_event);

    return TRUE;
}

static EVENT_NODE* DequeueEvent(void)
{
    EVENT_NODE* node = NULL;

    EnterCriticalSection(&g_state.queue_lock);
    if (g_state.queue_head) {
        node = g_state.queue_head;
        g_state.queue_head = node->next;
        if (!g_state.queue_head) {
            g_state.queue_tail = NULL;
        }
    }
    LeaveCriticalSection(&g_state.queue_lock);

    return node;
}

static void FreeEventNode(EVENT_NODE* node)
{
    if (node) {
        if (node->syslog_msg) {
            HeapFree(GetProcessHeap(), 0, node->syslog_msg);
        }
        HeapFree(GetProcessHeap(), 0, node);
    }
}

/* ------------------------------------------------------------------ */
/*  Worker thread: dequeues events and sends via TCP                  */
/* ------------------------------------------------------------------ */

static DWORD WINAPI WorkerThread(LPVOID param)
{
    UNREFERENCED_PARAMETER(param);

    HANDLE handles[2];
    handles[0] = g_state.queue_event;
    handles[1] = CreateEventW(NULL, TRUE, FALSE, NULL);
    /* handles[1] is never signaled from outside — we use shutdown flag */

    char hostname[256] = { 0 };
    GetLocalHostname(hostname, sizeof(hostname));

    while (!g_state.shutdown) {
        /* Attempt to connect if not connected */
        if (!g_state.connected) {
            if (!ConnectSyslog()) {
                /* Wait before retrying */
                Sleep(RECONNECT_INTERVAL);
                continue;
            }
            /* Connection established — show balloon notification */
            {
                WCHAR msg[256];
                StringCchPrintfW(msg, 256, L"Connected to syslog collector at %S:%S",
                    g_state.syslog_host, g_state.syslog_port);
                ShowNotification(NIIF_INFO, APP_NAME, msg);
            }
        }

        /* Wait for an event or shutdown */
        DWORD wait = WaitForSingleObject(g_state.queue_event, 1000);
        if (g_state.shutdown)
            break;

        if (wait == WAIT_OBJECT_0) {
            /* Drain the queue */
            for (;;) {
                EVENT_NODE* node = DequeueEvent();
                if (!node) break;

                /* Try to send */
                if (!SendAll(node->syslog_msg, node->msg_len)) {
                    /* Send failed — disconnect and requeue */
                    DisconnectSyslog();
                    ShowNotification(NIIF_WARNING, APP_NAME,
                        L"Connection lost - reconnecting...");
                    FreeEventNode(node);
                    break;
                }

                FreeEventNode(node);
            }
        }

        /* Reset the event if queue is empty */
        EnterCriticalSection(&g_state.queue_lock);
        if (!g_state.queue_head) {
            ResetEvent(g_state.queue_event);
        }
        LeaveCriticalSection(&g_state.queue_lock);
    }

    /* Drain remaining events on shutdown */
    for (;;) {
        EVENT_NODE* node = DequeueEvent();
        if (!node) break;
        if (g_state.connected) {
            SendAll(node->syslog_msg, node->msg_len);
        }
        FreeEventNode(node);
    }

    CloseHandle(handles[1]);
    return 0;
}

/* ------------------------------------------------------------------ */
/*  EvtSubscribe callback                                             */
/* ------------------------------------------------------------------ */

static DWORD WINAPI EventCallback(EVT_SUBSCRIBE_NOTIFY_ACTION action,
                                   PVOID context, EVT_HANDLE event)
{
    UNREFERENCED_PARAMETER(context);

    if (action != EvtSubscribeActionDeliver) {
        return ERROR_SUCCESS;
    }
    if (!event) {
        return ERROR_SUCCESS;
    }

    /* Render the event as XML */
    DWORD buffer_size = 0;
    DWORD buffer_used = 0;
    DWORD prop_count = 0;

    /* First call to determine required buffer size */
    EvtRender(NULL, event, EvtRenderEventXml, 0, NULL,
              &buffer_size, &prop_count);
    if (GetLastError() != ERROR_INSUFFICIENT_BUFFER || buffer_size == 0) {
        return ERROR_SUCCESS;
    }

    WCHAR* xml_wide = (WCHAR*)HeapAlloc(GetProcessHeap(),
                                         HEAP_ZERO_MEMORY, buffer_size);
    if (!xml_wide) return ERROR_SUCCESS;

    if (!EvtRender(NULL, event, EvtRenderEventXml, buffer_size,
                    xml_wide, &buffer_used, &prop_count)) {
        HeapFree(GetProcessHeap(), 0, xml_wide);
        return ERROR_SUCCESS;
    }

    /* Convert XML to UTF-8 */
    char* xml_utf8 = WideToUtf8Alloc(xml_wide);
    HeapFree(GetProcessHeap(), 0, xml_wide);
    if (!xml_utf8) return ERROR_SUCCESS;

    /* Update bookmark for this subscription channel */
    /* (We find the channel by the subscription context, but we update
       all bookmarks from each event for simplicity.) */
    EVT_HANDLE bm = EvtCreateBookmark(NULL);
    if (bm) {
        EvtUpdateBookmark(bm, event);
        /* Store in the first available bookmark slot */
        /* We just update all — the actual per-channel tracking is via
           the subscription handle, but for simplicity we maintain one
           bookmark per subscription. */
        int idx = (int)(LONG_PTR)context;
        if (idx >= 0 && idx < CHANNEL_COUNT) {
            if (g_state.bookmarks[idx].bookmark) {
                EvtClose(g_state.bookmarks[idx].bookmark);
            }
            g_state.bookmarks[idx].bookmark = bm;
        } else {
            EvtClose(bm);
        }
    }

    /* Format as syslog RFC 5424 */
    char hostname[256] = { 0 };
    GetLocalHostname(hostname, sizeof(hostname));

    char syslog_msg[MAX_SYSLOG_MSG];
    FormatSyslogMessage(syslog_msg, sizeof(syslog_msg), hostname, xml_utf8);
    HeapFree(GetProcessHeap(), 0, xml_utf8);

    /* Enqueue for the worker thread */
    size_t msg_len = strlen(syslog_msg);
    EnqueueEvent(syslog_msg, msg_len);

    /* Increment counter */
    InterlockedIncrement64(&g_state.events_collected);

    return ERROR_SUCCESS;
}

/* ------------------------------------------------------------------ */
/*  Subscription management                                           */
/* ------------------------------------------------------------------ */

static BOOL StartSubscriptions(void)
{
    g_state.sub_count = 0;
    memset(g_state.channel_active, 0, sizeof(g_state.channel_active));

    LoadBookmarks();

    for (int i = 0; i < (int)CHANNEL_COUNT; i++) {
        EVT_HANDLE bookmark = g_state.bookmarks[i].bookmark;
        DWORD flags = EvtSubscribeToFutureEvents;

        if (bookmark) {
            flags = EvtSubscribeStartAfterBookmark;
        }

        const WCHAR* query = g_channel_entries[i].query;
        if (!query) {
            query = L"*";
        }

        EVT_HANDLE sub = EvtSubscribe(
            NULL,                          /* no signal event      */
            NULL,                          /* no callback event    */
            g_channel_entries[i].name,     /* channel path         */
            query,                         /* XPath query          */
            bookmark,                      /* bookmark             */
            (PVOID)(LONG_PTR)i,            /* context: channel idx */
            EventCallback,                 /* callback function    */
            flags);

        if (!sub) {
            /* If bookmark-based subscribe failed, try without bookmark */
            if (bookmark) {
                sub = EvtSubscribe(NULL, NULL, g_channel_entries[i].name,
                                    query, NULL, (PVOID)(LONG_PTR)i,
                                    EventCallback,
                                    EvtSubscribeToFutureEvents);
            }

            if (!sub) {
                /* Channel may not exist on this system (e.g. Sysmon not
                   installed, McAfee not present); skip silently */
                continue;
            }
        }

        g_state.subscriptions[g_state.sub_count] = sub;
        g_state.channel_active[i] = TRUE;
        g_state.sub_count++;
    }

    return (g_state.sub_count > 0);
}

static void StopSubscriptions(void)
{
    /* Save bookmarks before closing subscriptions */
    SaveBookmarks();

    for (int i = 0; i < g_state.sub_count; i++) {
        if (g_state.subscriptions[i]) {
            EvtClose(g_state.subscriptions[i]);
            g_state.subscriptions[i] = NULL;
        }
    }
    g_state.sub_count = 0;

    /* Close bookmarks */
    for (int i = 0; i < CHANNEL_COUNT; i++) {
        if (g_state.bookmarks[i].bookmark) {
            EvtClose(g_state.bookmarks[i].bookmark);
            g_state.bookmarks[i].bookmark = NULL;
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Status dialog                                                     */
/* ------------------------------------------------------------------ */

/*
 * We build a simple status dialog programmatically instead of using
 * a resource file to keep everything in a single .c file.
 */

#define IDC_STATUS_LABEL    3001
#define IDC_STATUS_TEXT     3002
#define IDC_CLOSE_BTN       3003

static void UpdateStatusText(HWND hdlg)
{
    char text[4096];
    DWORD uptime_s = (GetTickCount() - g_state.start_tick) / 1000;
    DWORD hours   = uptime_s / 3600;
    DWORD minutes = (uptime_s % 3600) / 60;
    DWORD seconds = uptime_s % 60;

    const char* conn_status = g_state.connected ? "CONNECTED" : "DISCONNECTED";

    int offset = 0;
    StringCchPrintfA(text, sizeof(text),
        "TechvSOC Event Forwarder\r\n\r\n"
        "Status:\t\t%s\r\n"
        "Events Collected:\t%lld\r\n"
        "Uptime:\t\t%02lu:%02lu:%02lu\r\n"
        "Syslog Target:\t%s:%s\r\n"
        "Channels Active:\t%d / %d\r\n\r\n"
        "Active Channels:\r\n",
        conn_status,
        (long long)g_state.events_collected,
        hours, minutes, seconds,
        g_state.syslog_host, g_state.syslog_port,
        g_state.sub_count, (int)CHANNEL_COUNT);
    offset = (int)strlen(text);

    for (int i = 0; i < (int)CHANNEL_COUNT && offset < (int)sizeof(text) - 260; i++) {
        if (g_state.channel_active[i]) {
            const char* status_mark = "  [*] ";
            char entry[256];
            StringCchPrintfA(entry, sizeof(entry), "%s%S (%S)\r\n",
                status_mark,
                g_channel_entries[i].name,
                g_channel_entries[i].category ? g_channel_entries[i].category : L"General");
            StringCchCatA(text, sizeof(text), entry);
            offset += (int)strlen(entry);
        }
    }

    SetDlgItemTextA(hdlg, IDC_STATUS_TEXT, text);
}

static INT_PTR CALLBACK StatusDlgProc(HWND hdlg, UINT msg,
                                       WPARAM wp, LPARAM lp)
{
    UNREFERENCED_PARAMETER(lp);
    switch (msg) {
    case WM_INITDIALOG:
        SetTimer(hdlg, IDT_STATUS_TIMER, STATUS_INTERVAL, NULL);
        UpdateStatusText(hdlg);
        return TRUE;

    case WM_TIMER:
        if (wp == IDT_STATUS_TIMER) {
            UpdateStatusText(hdlg);
        }
        return TRUE;

    case WM_COMMAND:
        if (LOWORD(wp) == IDC_CLOSE_BTN || LOWORD(wp) == IDCANCEL) {
            KillTimer(hdlg, IDT_STATUS_TIMER);
            g_state.status_dialog = NULL;
            EndDialog(hdlg, 0);
            return TRUE;
        }
        break;

    case WM_CLOSE:
        KillTimer(hdlg, IDT_STATUS_TIMER);
        g_state.status_dialog = NULL;
        EndDialog(hdlg, 0);
        return TRUE;
    }
    return FALSE;
}

static void ShowStatusDialog(HINSTANCE inst)
{
    if (g_state.status_dialog && IsWindow(g_state.status_dialog)) {
        SetForegroundWindow(g_state.status_dialog);
        return;
    }

    /* Build a dialog template in memory */
    /*
     * We use a minimal DLGTEMPLATEEX structure to create a dialog
     * programmatically without a resource file.
     */
    struct {
        DLGTEMPLATE dlg;
        WORD menu;
        WORD cls;
        WORD title;
    } tmpl;

    memset(&tmpl, 0, sizeof(tmpl));
    tmpl.dlg.style = WS_POPUP | WS_CAPTION | WS_SYSMENU |
                     DS_MODALFRAME | DS_CENTER;
    tmpl.dlg.cx = 280;
    tmpl.dlg.cy = 200;
    tmpl.dlg.x  = 0;
    tmpl.dlg.y  = 0;
    tmpl.menu   = 0;
    tmpl.cls    = 0;
    tmpl.title  = 0;

    g_state.status_dialog = CreateDialogIndirectParamW(
        inst, &tmpl.dlg, NULL, StatusDlgProc, 0);

    if (g_state.status_dialog) {
        SetWindowTextW(g_state.status_dialog, L"TechvSOC Event Forwarder - Status");

        /* Create a multiline edit control and a Close button */
        RECT rc;
        GetClientRect(g_state.status_dialog, &rc);

        CreateWindowExW(0, L"EDIT", L"",
            WS_CHILD | WS_VISIBLE | WS_VSCROLL | ES_MULTILINE |
            ES_AUTOVSCROLL | ES_READONLY,
            10, 10, rc.right - 20, rc.bottom - 50,
            (HWND)g_state.status_dialog, (HMENU)(LONG_PTR)IDC_STATUS_TEXT,
            inst, NULL);

        CreateWindowExW(0, L"BUTTON", L"Close",
            WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
            rc.right / 2 - 40, rc.bottom - 35, 80, 25,
            (HWND)g_state.status_dialog, (HMENU)(LONG_PTR)IDC_CLOSE_BTN,
            inst, NULL);

        /* Use a monospace font */
        HFONT hfont = CreateFontW(14, 0, 0, 0, FW_NORMAL, FALSE, FALSE,
                                   FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                                   CLIP_DEFAULT_PRECIS, FIXED_PITCH,
                                   FF_MODERN, L"Consolas");
        SendDlgItemMessageW(g_state.status_dialog, IDC_STATUS_TEXT,
                             WM_SETFONT, (WPARAM)hfont, TRUE);

        ShowWindow(g_state.status_dialog, SW_SHOW);
        UpdateWindow(g_state.status_dialog);
    }
}

/* ------------------------------------------------------------------ */
/*  Tray icon & context menu                                          */
/* ------------------------------------------------------------------ */

static void ShowNotification(DWORD icon_type, const WCHAR* title, const WCHAR* text)
{
    if (!g_state.nid.hWnd) return;

    g_state.nid.uFlags    |= NIF_INFO;
    g_state.nid.dwInfoFlags = icon_type;

    StringCchCopyW(g_state.nid.szInfoTitle,
                    sizeof(g_state.nid.szInfoTitle) / sizeof(WCHAR),
                    title ? title : APP_NAME);
    StringCchCopyW(g_state.nid.szInfo,
                    sizeof(g_state.nid.szInfo) / sizeof(WCHAR),
                    text ? text : L"");

    Shell_NotifyIconW(NIM_MODIFY, &g_state.nid);
}

static BOOL AddTrayIcon(void)
{
    HICON hAppIcon = LoadIcon(GetModuleHandleW(NULL),
                               MAKEINTRESOURCE(IDI_APP_ICON));
    if (!hAppIcon) {
        hAppIcon = LoadIconW(NULL, IDI_SHIELD);
    }

    memset(&g_state.nid, 0, sizeof(g_state.nid));
    g_state.nid.cbSize           = sizeof(NOTIFYICONDATAW);
    g_state.nid.hWnd             = g_state.msg_window;
    g_state.nid.uID              = 1;
    g_state.nid.uFlags           = NIF_ICON | NIF_TIP | NIF_MESSAGE | NIF_INFO;
    g_state.nid.uCallbackMessage = WM_TRAYICON;
    g_state.nid.hIcon            = hAppIcon;
    g_state.nid.dwInfoFlags      = NIIF_NONE;
    StringCchCopyW(g_state.nid.szTip, sizeof(g_state.nid.szTip) / sizeof(WCHAR),
                    APP_NAME);

    return Shell_NotifyIconW(NIM_ADD, &g_state.nid);
}

static void RemoveTrayIcon(void)
{
    Shell_NotifyIconW(NIM_DELETE, &g_state.nid);
}

static void ShowContextMenu(HWND hwnd)
{
    if (!g_state.tray_menu) {
        g_state.tray_menu = CreatePopupMenu();
        if (!g_state.tray_menu) return;
        AppendMenuW(g_state.tray_menu, MF_STRING, IDM_SHOW_STATUS,
                     L"Show Status");
        AppendMenuW(g_state.tray_menu, MF_STRING, IDM_RESTART,
                     L"Restart Collection");
        AppendMenuW(g_state.tray_menu, MF_SEPARATOR, 0, NULL);
        AppendMenuW(g_state.tray_menu, MF_STRING, IDM_EXIT, L"Exit");
    }

    POINT pt;
    GetCursorPos(&pt);
    SetForegroundWindow(hwnd);
    TrackPopupMenu(g_state.tray_menu, TPM_RIGHTBUTTON,
                    pt.x, pt.y, 0, hwnd, NULL);
}

/* ------------------------------------------------------------------ */
/*  Message-only window procedure                                     */
/* ------------------------------------------------------------------ */

static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg,
                                 WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_TRAYICON:
        switch (LOWORD(lp)) {
        case WM_RBUTTONUP:
        case WM_CONTEXTMENU:
            ShowContextMenu(hwnd);
            break;
        case WM_LBUTTONDBLCLK:
            ShowStatusDialog((HINSTANCE)GetModuleHandleW(NULL));
            break;
        }
        return 0;

    case WM_COMMAND:
        switch (LOWORD(wp)) {
        case IDM_SHOW_STATUS:
            ShowStatusDialog((HINSTANCE)GetModuleHandleW(NULL));
            break;
        case IDM_RESTART:
            /* Stop and restart subscriptions */
            StopSubscriptions();
            StartSubscriptions();
            break;
        case IDM_EXIT:
            PostQuitMessage(0);
            break;
        }
        return 0;

    case WM_DESTROY:
        RemoveTrayIcon();
        PostQuitMessage(0);
        return 0;
    }

    return DefWindowProcW(hwnd, msg, wp, lp);
}

static BOOL RegisterWindowClass(HINSTANCE inst)
{
    WNDCLASSEXW wc;
    memset(&wc, 0, sizeof(wc));
    wc.cbSize        = sizeof(wc);
    wc.lpfnWndProc   = WndProc;
    wc.hInstance      = inst;
    wc.lpszClassName  = APP_CLASS;

    return (RegisterClassExW(&wc) != 0);
}

static BOOL CreateMessageWindow(HINSTANCE inst)
{
    g_state.msg_window = CreateWindowExW(
        0, APP_CLASS, L"TechvSOCEventForwarder",
        0, 0, 0, 0, 0,
        HWND_MESSAGE,    /* message-only window */
        NULL, inst, NULL);

    return (g_state.msg_window != NULL);
}

/* ------------------------------------------------------------------ */
/*  Initialization and cleanup                                        */
/* ------------------------------------------------------------------ */

static BOOL Initialize(HINSTANCE inst)
{
    memset(&g_state, 0, sizeof(g_state));
    g_state.sock = INVALID_SOCKET;

    InitializeCriticalSection(&g_state.queue_lock);
    /* Fix: we need a manual-reset event for the queue */
    g_state.queue_event = CreateEventW(NULL, TRUE, FALSE, NULL);
    if (!g_state.queue_event) {
        return FALSE;
    }

    g_state.start_tick = GetTickCount();

    /* Load configuration */
    if (!LoadConfiguration()) {
        ShowNotification(NIIF_ERROR, APP_NAME,
            L"Fatal: Failed to load configuration");
        return FALSE;
    }

    /* Initialize Winsock */
    if (!InitializeWinsock()) {
        ShowNotification(NIIF_ERROR, APP_NAME,
            L"Fatal: Winsock initialization failed");
        return FALSE;
    }

    /* Register window class and create message window */
    if (!RegisterWindowClass(inst)) {
        CleanupWinsock();
        return FALSE;
    }

    if (!CreateMessageWindow(inst)) {
        CleanupWinsock();
        return FALSE;
    }

    /* Add system tray icon */
    if (!AddTrayIcon()) {
        /* Non-fatal — continue without tray icon */
    }

    /* Start event subscriptions */
    if (!StartSubscriptions()) {
        /* At least one channel should work; if none, still run */
    }

    /* Show notification with active channel count */
    {
        WCHAR msg[256];
        StringCchPrintfW(msg, 256, L"Monitoring %d event channels",
            g_state.sub_count);
        ShowNotification(NIIF_INFO, APP_NAME, msg);
    }

    /* Start worker thread */
    g_state.shutdown = 0;
    g_state.worker_thread = CreateThread(NULL, 0, WorkerThread, NULL,
                                          0, NULL);
    if (!g_state.worker_thread) {
        StopSubscriptions();
        RemoveTrayIcon();
        CleanupWinsock();
        return FALSE;
    }

    return TRUE;
}

static void Cleanup(void)
{
    /* Signal shutdown */
    InterlockedExchange(&g_state.shutdown, 1);

    /* Wake up the worker thread */
    SetEvent(g_state.queue_event);

    /* Wait for worker thread to finish */
    if (g_state.worker_thread) {
        WaitForSingleObject(g_state.worker_thread, 5000);
        CloseHandle(g_state.worker_thread);
        g_state.worker_thread = NULL;
    }

    /* Save bookmarks */
    SaveBookmarks();

    /* Stop subscriptions */
    StopSubscriptions();

    /* Disconnect syslog */
    DisconnectSyslog();

    /* Remove tray icon */
    RemoveTrayIcon();

    /* Clean up queue */
    for (;;) {
        EVENT_NODE* node = DequeueEvent();
        if (!node) break;
        FreeEventNode(node);
    }

    /* Clean up critical section */
    DeleteCriticalSection(&g_state.queue_lock);

    /* Close queue event */
    if (g_state.queue_event) {
        CloseHandle(g_state.queue_event);
        g_state.queue_event = NULL;
    }

    /* Destroy menu */
    if (g_state.tray_menu) {
        DestroyMenu(g_state.tray_menu);
        g_state.tray_menu = NULL;
    }

    /* Cleanup Winsock */
    CleanupWinsock();

    /* Destroy message window */
    if (g_state.msg_window) {
        DestroyWindow(g_state.msg_window);
        g_state.msg_window = NULL;
    }
}

/* ------------------------------------------------------------------ */
/*  WinMain entry point                                               */
/* ------------------------------------------------------------------ */

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance,
                    LPSTR lpCmdLine, int nCmdShow)
{
    UNREFERENCED_PARAMETER(hPrevInstance);
    UNREFERENCED_PARAMETER(lpCmdLine);
    UNREFERENCED_PARAMETER(nCmdShow);

    /* Prevent multiple instances */
    HANDLE mutex = CreateMutexW(NULL, TRUE, L"TechvSOCEventForwarderMutex");
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        CloseHandle(mutex);
        return 1;
    }

    /* Initialize */
    if (!Initialize(hInstance)) {
        CloseHandle(mutex);
        return 1;
    }

    /* Message loop */
    MSG msg;
    while (GetMessageW(&msg, NULL, 0, 0) > 0) {
        if (g_state.status_dialog && IsDialogMessageW(g_state.status_dialog, &msg)) {
            continue;
        }
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    /* Cleanup */
    Cleanup();

    ReleaseMutex(mutex);
    CloseHandle(mutex);

    return 0;
}
