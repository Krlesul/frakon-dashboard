DOMAIN = "frakon_dashboard"
STORAGE_KEY = "frakon_dashboard.dashboards"
STORAGE_VERSION = 1
DATA_BACKEND = "backend"
DATA_WEBSOCKET_REGISTERED = "websocket_registered"
DATA_FRONTEND_REGISTERED = "frontend_registered"

FRONTEND_URL_PATH = "/frakon-dashboard"
FRONTEND_FILENAME = "frakon-dashboard.js"

READABLE_DOCUMENT_VERSIONS = frozenset({1, 2})
WRITABLE_DOCUMENT_VERSIONS = frozenset({1})

RESPONSIVE_CANVAS_V2_KIND = "responsive-canvas-v2"
RESPONSIVE_CANVAS_V2_CONTRACT_VERSION = 1
RESPONSIVE_CANVAS_V2_MAX_ITEMS = 2000
RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS = 4000
RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES = 2_000_000
RESPONSIVE_CANVAS_V2_STORAGE_KEY = "frakon_dashboard.responsive_dashboards"
RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT = "frakon/dashboard/load_responsive_bundle_revision"
RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT = "frakon/dashboard/dry_run_responsive_revision"
RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT = "frakon/dashboard/save_responsive_revision"
RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT = "frakon/dashboard/remove_responsive_revision"
READABLE_RESPONSIVE_BUNDLE_KINDS = frozenset({RESPONSIVE_CANVAS_V2_KIND})
WRITABLE_RESPONSIVE_BUNDLE_KINDS = frozenset()
