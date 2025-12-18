<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Multi-Media Bookmarks</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="cookies.css">
    <!-- PreviewBox link previews -->
    <script src="https://cdn.jsdelivr.net/npm/@mariusbongarts/previewbox/dist/index.min.js"></script>
</head>
<body>

    <header class="header">
        <div class="brand">
                        <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-5-7 5V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
            <h1>Bookmarks</h1>
        </div>
        <div class="header-actions">
            <div class="search-wrapper">
                <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input id="search-input" type="search" placeholder="Search bookmarks…">
                <button class="search-button" id="search-button" type="button" title="Search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </button>
            </div>
            <button class="add-button" id="add-demo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Bookmark
            </button>
            <div class="user-menu">
                <span class="username" id="username-display">User</span>
                <button class="logout-btn" id="logout-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </div>
        </div>
    </header>

    <div class="container">

        <aside class="sidebar">
            <div class="sidebar-section">
                <p class="sidebar-label">General</p>
                <ul class="category-list">
                    <li class="category-item active" data-collection="">All <span class="pill">•</span></li>
                    <li class="category-item" data-collection="unsorted">Unsorted</li>
                </ul>
            </div>
            <div class="sidebar-section">
                <p class="sidebar-label">Collections</p>
                <ul class="category-list nested" id="collections-list">
                    <!-- Collections loaded dynamically -->
                </ul>
                <button class="new-collection" id="new-collection-btn">+ New collection…</button>
            </div>
        </aside>

        <main class="main-content">
            <div class="content-header">
                <div class="header-info">
                    <nav class="breadcrumb">
                        <span>Collections</span>
                        <span class="separator">/</span>
                        <span class="current-category">All</span>
                    </nav>
                    <h2 class="collection-title" id="collection-title">All Bookmarks</h2>
                    <p class="bookmark-count" id="bookmark-count">0 bookmarks</p>
                </div>
                <div class="header-filters">
                    <div class="tag-filter" id="tag-filter"></div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="grid" title="Grid view">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </button>
                        <button class="view-btn" data-view="list" title="List view">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <section class="bookmark-grid" id="bookmark-grid"></section>
            <div class="empty-state" id="empty-state" style="display: none;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <h3>No bookmarks yet</h3>
                <p>Start saving your favorite links, images, and content</p>
                <button class="add-button" id="add-empty-btn">Add Your First Bookmark</button>
            </div>
        </main>

    </div>
    
    <!-- Add Bookmark Modal -->
    <div id="bookmark-modal" class="modal hidden">
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Bookmark</h2>
                <button type="button" class="modal-close">&times;</button>
            </div>
            <form id="bookmark-form" class="modal-form">
                <div class="form-field">
                    <label class="form-label" for="bookmark-title">Title</label>
                    <input class="form-input" type="text" id="bookmark-title" name="title" required placeholder="Bookmark title">
                </div>
                <div class="form-field">
                    <label class="form-label" for="bookmark-url">URL</label>
                    <input class="form-input" type="url" id="bookmark-url" name="url" placeholder="https://example.com">
                </div>
                <div class="form-field">
                    <label class="form-label" for="bookmark-type">Type</label>
                    <select class="form-input" id="bookmark-type" name="type">
                        <option value="link">Link</option>
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="audio">Audio</option>
                        <option value="video">Video</option>
                    </select>
                </div>
                <div class="form-field">
                    <label class="form-label" for="bookmark-content">Content/Description</label>
                    <textarea class="form-input" id="bookmark-content" name="content" placeholder="Add content or description"></textarea>
                </div>
                <div class="form-field">
                    <label class="form-label" for="bookmark-collection">Collection</label>
                    <select class="form-input" id="bookmark-collection" name="collection_id">
                        <option value="">Unsorted</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" id="bookmark-cancel">Cancel</button>
                    <button type="submit" class="btn-primary">Add Bookmark</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Add Collection Modal -->
    <div id="collection-modal" class="modal hidden">
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>New Collection</h2>
                <button type="button" class="modal-close">&times;</button>
            </div>
            <form id="collection-form" class="modal-form">
                <div class="form-field">
                    <label class="form-label" for="collection-name">Collection Name</label>
                    <input class="form-input" type="text" id="collection-name" name="name" required placeholder="e.g., Work, Personal, Reading">
                </div>
                <div class="form-field">
                    <label class="form-label" for="collection-parent">Parent Collection (Optional)</label>
                    <select class="form-input" id="collection-parent" name="parent_id">
                        <option value="">None</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" id="collection-cancel">Cancel</button>
                    <button type="submit" class="btn-primary">Create Collection</button>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Cookie Consent Dialog -->
    <div id="cookie-consent-dialog" class="cookie-consent-dialog">
        <div class="cookie-content">
            <h3>Cookie Notice</h3>
            <p>We use cookies to manage your session and keep you logged in. Cookies are essential for the app to function properly.</p>
            <p>We use a minimal cookie only for consent preferences. Authentication is handled without server sessions.</p>
            <div class="cookie-actions">
                <button id="cookie-decline-btn" class="cookie-btn cookie-btn-secondary">Decline</button>
                <button id="cookie-accept-btn" class="cookie-btn cookie-btn-primary">Accept</button>
            </div>
        </div>
    </div>

    <script>
        // Resolve API base relative to this page so deployments under subfolders (e.g. /~user/app) work
        const API_BASE = (() => {
            const parts = window.location.pathname.split('/');
            parts.pop(); // drop current file
            const base = parts.join('/') || '';
            return `${base}/api`;
        })();
    </script>
    <script src="cookies.js"></script>
    <script src="app.js"></script>
</body>
</html>

