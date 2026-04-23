from app.db.session import create_database_tables


def main() -> None:
    create_database_tables()
    print("TechvSOC XDR Platform database tables created successfully.")


if __name__ == "__main__":
    main()
