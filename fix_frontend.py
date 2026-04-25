import os

BASE = "/home/fathersaab/jat/projects/TechvSOC XDR Platform"

# ========== Fix IncidentsPage.jsx ==========
path = os.path.join(BASE, "frontend/src/pages/IncidentsPage.jsx")
with open(path) as f:
    content = f.read()

# Fix 1: Timeline section missing closing </div>
content = content.replace(
    '''                        </div>
                      ))}
                    </div>
                )}''',
    '''                        </div>
                      ))}
                    </div>
                )}'''
)

# Fix 2: Alerts section missing closing </div>
content = content.replace(
    '''                      </div>
                    ))}
                  </div>
                )}
              </>''',
    '''                      </div>
                    ))}
                  </div>
              )}'''
)

# Fix 3: Incident card missing closing </div> for flex container
content = content.replace(
    '''                  <div className="flex shrink-0 gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">''',
    '''                  <div className="flex shrink-0 gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">'''
)

with open(path, "w") as f:
    f.write(content)
print("Fixed IncidentsPage.jsx")

# ========== Fix ThreatHuntingPage.jsx ==========
path = os.path.join(BASE, "frontend/src/pages/ThreatHuntingPage.jsx")
with open(path) as f:
    content = f.read()

# Fix: Missing closing </div> for grid and </div> for threat_categories section
content = content.replace(
    '''            </div>
          {intel.threat_categories && (''',
    '''            </div>
          {intel.threat_categories && ('''
)

content = content.replace(
    '''            </p>
          )}
        </Panel>''',
    '''            </p>
          )}
        </div>
        </Panel>'''
)

with open(path, "w") as f:
    f.write(content)
print("Fixed ThreatHuntingPage.jsx")

# ========== Verify EndpointsPage.jsx ==========
path = os.path.join(BASE, "frontend/src/pages/EndpointsPage.jsx")
with open(path) as f:
    content = f.read()

# Quick check: count div tags
open_div = content.count("<div")
close_div = content.count("</div>")
print(f"EndpointsPage.jsx: <div={open_div}, </div>={close_div}")

# ========== Verify App.jsx ==========
path = os.path.join(BASE, "frontend/src/App.jsx")
with open(path) as f:
    content = f.read()

open_div = content.count("<div")
close_div = content.count("</div>")
print(f"App.jsx: <div={open_div}, </div>={close_div}")

# Count other JSX tags
open_span = content.count("<span")
close_span = content.count("</span>")
print(f"App.jsx: <span={open_span}, </span>={close_span}")

print("All fixes applied.")
