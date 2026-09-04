Client
    Component/System architecture

Game Server
    Server authoritative

Backend
    Modular Monolith
    Controller
    Application
    Domain
    Repository
    Infrastructure

Database
    PostgreSQL
    migrations
    parameterized queries

Shared
    DTO
    schemas
    contracts
    enums/types




 Domain must not depend on infrastructure.
Controllers contain no business logic.
Client cannot be trusted.
Gameplay does not use MVC.
No direct database access from controllers.
No circular dependencies.
Composition preferred over deep inheritance.
