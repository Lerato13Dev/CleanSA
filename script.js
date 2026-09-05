/* =========================================================================
   CleanSA — Application logic
   -------------------------------------------------------------------------
   Sections:
     1.  Sample / mock data            (would come from a database)
     2.  API abstraction layer         (swap for real HTTP calls later)
     3.  State & persistence           (localStorage — prototype only)
     4.  Utility helpers
     5.  Map (Leaflet) — provider-agnostic wrapper
     6.  Rendering: stats, cards, map markers
     7.  Filtering & search
     8.  Report details modal
     9.  Report Litter — multi-step form
     10. Toasts
     11. Navbar / general UI wiring
     12. Init
   ========================================================================= */

(function () {
  "use strict";

  /* =======================================================================
     1. SAMPLE / MOCK DATA
     In production this would be served by a backend (see API layer below).
     These are clearly demo reports — see README for the verification policy.
  ========================================================================= */

  const PROVINCES = [
    "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
    "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape"
  ];

  // A small lookup of real South African places, used for "search location"
  // and to translate coordinates to an approximate place name. A production
  // build would call a geocoding API (e.g. Nominatim) instead.
  const KNOWN_PLACES = [
    { name: "Johannesburg, Gauteng", lat: -26.2041, lng: 28.0473, province: "Gauteng" },
    { name: "Pretoria, Gauteng", lat: -25.7479, lng: 28.2293, province: "Gauteng" },
    { name: "Soweto, Gauteng", lat: -26.2678, lng: 27.8585, province: "Gauteng" },
    { name: "Cape Town, Western Cape", lat: -33.9249, lng: 18.4241, province: "Western Cape" },
    { name: "Stellenbosch, Western Cape", lat: -33.9321, lng: 18.8602, province: "Western Cape" },
    { name: "Durban, KwaZulu-Natal", lat: -29.8587, lng: 31.0218, province: "KwaZulu-Natal" },
    { name: "Pietermaritzburg, KwaZulu-Natal", lat: -29.6006, lng: 30.3794, province: "KwaZulu-Natal" },
    { name: "Gqeberha, Eastern Cape", lat: -33.9608, lng: 25.6022, province: "Eastern Cape" },
    { name: "East London, Eastern Cape", lat: -33.0153, lng: 27.9116, province: "Eastern Cape" },
    { name: "Bloemfontein, Free State", lat: -29.0852, lng: 26.1596, province: "Free State" },
    { name: "Polokwane, Limpopo", lat: -23.9045, lng: 29.4689, province: "Limpopo" },
    { name: "Mbombela, Mpumalanga", lat: -25.4753, lng: 30.9694, province: "Mpumalanga" },
    { name: "Rustenburg, North West", lat: -25.6672, lng: 27.2424, province: "North West" },
    { name: "Kimberley, Northern Cape", lat: -28.7282, lng: 24.7499, province: "Northern Cape" }
  ];

  const WASTE_TYPES = [
    "Household waste", "Plastic", "Illegal dumping",
    "Construction waste", "Food waste", "Electronic waste", "Other"
  ];

  const STATUS_ORDER = [
    "Reported", "Under Review", "Verified",
    "Cleanup Planned", "Cleanup In Progress", "Resolved"
  ];

  // Reports don't use photo services (e.g. random stock-photo APIs) for
  // placeholder imagery — those return arbitrary, unrelated photos rather
  // than anything matching the report's actual content. Instead each waste
  // type maps to a small custom illustration, embedded directly as a data
  // URI (not a separate file) so the image always loads regardless of how
  // this project's files get copied, downloaded, or hosted.
  const WASTE_IMAGES = {
    "Household waste": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI0VGRUFEOSIvPgogIDxyZWN0IHk9IjAiIHdpZHRoPSI1MDAiIGhlaWdodD0iMTkwIiBmaWxsPSIjRENFN0RDIi8+CiAgPHJlY3QgeT0iMTkwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjEzMCIgZmlsbD0iI0RDRDNCOCIvPgogIDxlbGxpcHNlIGN4PSIxMjAiIGN5PSIzMDAiIHJ4PSIxNTAiIHJ5PSIxOCIgZmlsbD0iI0M5QkU5QyIvPgogIDxlbGxpcHNlIGN4PSIzNjAiIGN5PSIzMDUiIHJ4PSIxMjAiIHJ5PSIxNCIgZmlsbD0iI0M5QkU5QyIvPgoKICA8IS0tIG92ZXJmbG93aW5nIGJhZ3MgLS0+CiAgPGVsbGlwc2UgY3g9IjkwIiBjeT0iMjU1IiByeD0iNTUiIHJ5PSIzOCIgZmlsbD0iIzFCMjExRCIvPgogIDxwYXRoIGQ9Ik00NSAyNTUgUTkwIDIxMCAxMzUgMjU1IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iNCIvPgogIDxlbGxpcHNlIGN4PSIxNzUiIGN5PSIyNzAiIHJ4PSI0MiIgcnk9IjMwIiBmaWxsPSIjM0EzRjNCIi8+CiAgPHBhdGggZD0iTTE0MCAyNzAgUTE3NSAyMzYgMjEwIDI3MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIyIiBzdHJva2Utd2lkdGg9IjQiLz4KCiAgPCEtLSB3aGVlbGllIGJpbiAtLT4KICA8cmVjdCB4PSIyNTUiIHk9IjE1MCIgd2lkdGg9IjExMCIgaGVpZ2h0PSIxNDAiIHJ4PSIxMCIgZmlsbD0iIzFGNkI0NSIvPgogIDxyZWN0IHg9IjI1NSIgeT0iMTUwIiB3aWR0aD0iMTEwIiBoZWlnaHQ9IjI2IiByeD0iOCIgZmlsbD0iIzE2M0MyQyIvPgogIDxyZWN0IHg9IjI0NSIgeT0iMTMwIiB3aWR0aD0iMTMwIiBoZWlnaHQ9IjI0IiByeD0iNiIgZmlsbD0iIzEyNEQzMSIvPgogIDxjaXJjbGUgY3g9IjI3MCIgY3k9IjI5OCIgcj0iMTIiIGZpbGw9IiMxQjIxMUQiLz4KICA8Y2lyY2xlIGN4PSIzNTAiIGN5PSIyOTgiIHI9IjEyIiBmaWxsPSIjMUIyMTFEIi8+CgogIDwhLS0gc3BpbGxpbmcgZGVicmlzIGZyb20gYmluIC0tPgogIDxyZWN0IHg9IjMzMCIgeT0iMTIwIiB3aWR0aD0iMzQiIGhlaWdodD0iMjIiIHJ4PSIzIiBmaWxsPSIjQzk5QTNCIiB0cmFuc2Zvcm09InJvdGF0ZSgxOCAzNDcgMTMxKSIvPgogIDxyZWN0IHg9IjM2MCIgeT0iMTQwIiB3aWR0aD0iMjYiIGhlaWdodD0iMTgiIHJ4PSIzIiBmaWxsPSIjQjA0NzJCIiB0cmFuc2Zvcm09InJvdGF0ZSgtMTIgMzczIDE0OSkiLz4KICA8Y2lyY2xlIGN4PSI0MDAiIGN5PSIxNzAiIHI9IjEwIiBmaWxsPSIjNENBNzcyIi8+CgogIDwhLS0gc2NhdHRlcmVkIGl0ZW1zIC0tPgogIDxyZWN0IHg9IjQwMCIgeT0iMjU1IiB3aWR0aD0iNjAiIGhlaWdodD0iMjAiIHJ4PSI0IiBmaWxsPSIjOEM3QTREIi8+CiAgPGNpcmNsZSBjeD0iNDMwIiBjeT0iMjQwIiByPSIxMCIgZmlsbD0iI0IwNDcyQiIvPgo8L3N2Zz4K",
    "Plastic": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI0UzRUVGMiIvPgogIDxyZWN0IHk9IjAiIHdpZHRoPSI1MDAiIGhlaWdodD0iMTcwIiBmaWxsPSIjRDdFOUVFIi8+CiAgPHJlY3QgeT0iMjMwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjNEM4NkEwIi8+CiAgPHJlY3QgeT0iMjAwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjOEZCRUNGIi8+CiAgPGVsbGlwc2UgY3g9IjE1MCIgY3k9IjIzMCIgcng9IjE4MCIgcnk9IjIwIiBmaWxsPSIjQzlCRTlDIi8+CgogIDwhLS0gYm90dGxlcyAtLT4KICA8ZyBmaWxsPSIjOEZEM0M3IiBzdHJva2U9IiMzRThDN0MiIHN0cm9rZS13aWR0aD0iMiI+CiAgICA8cmVjdCB4PSI3MCIgeT0iMTUwIiB3aWR0aD0iMjIiIGhlaWdodD0iNzAiIHJ4PSI2Ii8+CiAgICA8cmVjdCB4PSI3NiIgeT0iMTM4IiB3aWR0aD0iMTAiIGhlaWdodD0iMTYiIHJ4PSIyIi8+CiAgICA8cmVjdCB4PSIxNDAiIHk9IjE3MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjU1IiByeD0iNiIgdHJhbnNmb3JtPSJyb3RhdGUoMTggMTUwIDE5NykiLz4KICAgIDxyZWN0IHg9IjIwNSIgeT0iMTYwIiB3aWR0aD0iMjIiIGhlaWdodD0iNjUiIHJ4PSI2IiB0cmFuc2Zvcm09InJvdGF0ZSgtMTAgMjE2IDE5MikiLz4KICA8L2c+CiAgPGcgZmlsbD0iI0M3RThFMCIgc3Ryb2tlPSIjM0U4QzdDIiBzdHJva2Utd2lkdGg9IjIiPgogICAgPHJlY3QgeD0iMjcwIiB5PSIxNzUiIHdpZHRoPSIyMCIgaGVpZ2h0PSI1NSIgcng9IjYiIHRyYW5zZm9ybT0icm90YXRlKDggMjgwIDIwMikiLz4KICAgIDxyZWN0IHg9IjMyMCIgeT0iMTY1IiB3aWR0aD0iMjIiIGhlaWdodD0iNjUiIHJ4PSI2IiB0cmFuc2Zvcm09InJvdGF0ZSgtMTUgMzMxIDE5NykiLz4KICA8L2c+CgogIDwhLS0gZmxvYXRpbmcgYmFncyAtLT4KICA8cGF0aCBkPSJNMzcwIDE5MCBRNDAwIDE2NSA0MzAgMTkwIFE0MjUgMjIwIDQwMCAyMjIgUTM3NSAyMjAgMzcwIDE5MCBaIiBmaWxsPSIjRjZGNEVFIiBvcGFjaXR5PSIwLjg1Ii8+CiAgPHBhdGggZD0iTTEwMCAyMDAgUTEyMCAxODIgMTQwIDIwMCBRMTM2IDIyMCAxMTggMjIyIFExMDIgMjIwIDEwMCAyMDAgWiIgZmlsbD0iI0Y2RjRFRSIgb3BhY2l0eT0iMC44NSIvPgoKICA8IS0tIHNjYXR0ZXJlZCBjYXBzIC0tPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjIzNSIgcj0iNiIgZmlsbD0iI0M5OUEzQiIvPgogIDxjaXJjbGUgY3g9IjMxMCIgY3k9IjI0NSIgcj0iNiIgZmlsbD0iI0IwNDcyQiIvPgogIDxjaXJjbGUgY3g9IjE4MCIgY3k9IjI0MCIgcj0iNiIgZmlsbD0iIzRDQTc3MiIvPgo8L3N2Zz4K",
    "Illegal dumping": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI0VBRTNEMiIvPgogIDxyZWN0IHk9IjAiIHdpZHRoPSI1MDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRTRFOUREIi8+CiAgPHJlY3QgeT0iMTgwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iI0M5Qjk4RiIvPgogIDxyZWN0IHk9IjE4MCIgd2lkdGg9IjUwMCIgaGVpZ2h0PSIxNCIgZmlsbD0iI0IwNDcyQiIgb3BhY2l0eT0iMC41Ii8+CgogIDwhLS0gdGlyZSAtLT4KICA8Y2lyY2xlIGN4PSIxMTAiIGN5PSIyNjAiIHI9IjQ2IiBmaWxsPSIjMkIyQjJCIi8+CiAgPGNpcmNsZSBjeD0iMTEwIiBjeT0iMjYwIiByPSIyMCIgZmlsbD0iIzVBNUE1QSIvPgoKICA8IS0tIG1hdHRyZXNzIC0tPgogIDxyZWN0IHg9IjE3MCIgeT0iMjM1IiB3aWR0aD0iMTQwIiBoZWlnaHQ9IjQwIiByeD0iMTAiIGZpbGw9IiNFN0RGQzkiIHN0cm9rZT0iI0I3QTg3RCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPGxpbmUgeDE9IjE4NSIgeTE9IjIzNSIgeDI9IjE4NSIgeTI9IjI3NSIgc3Ryb2tlPSIjQjdBODdEIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8bGluZSB4MT0iMjI1IiB5MT0iMjM1IiB4Mj0iMjI1IiB5Mj0iMjc1IiBzdHJva2U9IiNCN0E4N0QiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxsaW5lIHgxPSIyNjUiIHkxPSIyMzUiIHgyPSIyNjUiIHkyPSIyNzUiIHN0cm9rZT0iI0I3QTg3RCIgc3Ryb2tlLXdpZHRoPSIyIi8+CgogIDwhLS0gYm94ZXMgYW5kIGJhZ3MgLS0+CiAgPHJlY3QgeD0iMzIwIiB5PSIyMTAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1NSIgcng9IjQiIGZpbGw9IiNDOTlBM0IiLz4KICA8cmVjdCB4PSIzMjAiIHk9IjIxMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjE0IiBmaWxsPSIjQTY3RDJCIi8+CiAgPGVsbGlwc2UgY3g9IjQxMCIgY3k9IjI1NSIgcng9IjQ1IiByeT0iMzIiIGZpbGw9IiMxQjIxMUQiLz4KICA8ZWxsaXBzZSBjeD0iNjAiIGN5PSIyMzAiIHJ4PSIzMCIgcnk9IjIyIiBmaWxsPSIjM0EzRjNCIi8+CgogIDwhLS0gc2NhdHRlcmVkIGRlYnJpcyAtLT4KICA8cmVjdCB4PSIyNDAiIHk9IjI4NSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjEwIiByeD0iMyIgZmlsbD0iIzhDN0E0RCIvPgogIDxjaXJjbGUgY3g9IjM1MCIgY3k9IjI5MCIgcj0iOCIgZmlsbD0iI0IwNDcyQiIvPgogIDxyZWN0IHg9IjkwIiB5PSIyODgiIHdpZHRoPSIyMCIgaGVpZ2h0PSI4IiByeD0iMiIgZmlsbD0iIzRDQTc3MiIvPgo8L3N2Zz4K",
    "Construction waste": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI0VERTdEQSIvPgogIDxyZWN0IHk9IjAiIHdpZHRoPSI1MDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRTZFMkQ0Ii8+CiAgPHJlY3QgeT0iMTgwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iI0NCQkZBNCIvPgoKICA8IS0tIGNvbmNyZXRlIHJ1YmJsZSBjaHVua3MgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSI3MCwyOTAgMTMwLDI1MCAxOTAsMjcwIDE3MCwzMDAgOTAsMzAwIiBmaWxsPSIjQjdBRjlFIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNTAsMzAwIDIxMCwyNjAgMjcwLDI4NSAyNTAsMzA1IiBmaWxsPSIjOUM5Njg2Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNjAsMjk1IDMyMCwyNTUgMzgwLDI3NSAzNjAsMzAwIDI4MCwzMDUiIGZpbGw9IiNDNEJDQTkiLz4KICA8cG9seWdvbiBwb2ludHM9IjM2MCwzMDAgNDEwLDI2NSA0NjAsMjg1IDQ0MCwzMDUiIGZpbGw9IiNBNzlGOEMiLz4KCiAgPCEtLSByZWJhciAtLT4KICA8bGluZSB4MT0iMTIwIiB5MT0iMjYwIiB4Mj0iOTAiIHkyPSIyMjAiIHN0cm9rZT0iI0IwNDcyQiIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8bGluZSB4MT0iMzAwIiB5MT0iMjYwIiB4Mj0iMzMwIiB5Mj0iMjE1IiBzdHJva2U9IiNCMDQ3MkIiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CgogIDwhLS0gYnJpY2tzIC0tPgogIDxnIGZpbGw9IiNCMDQ3MkIiPgogICAgPHJlY3QgeD0iMjAwIiB5PSIyMzAiIHdpZHRoPSIzOCIgaGVpZ2h0PSIyMCIgcng9IjIiLz4KICAgIDxyZWN0IHg9IjI0MCIgeT0iMjMwIiB3aWR0aD0iMzgiIGhlaWdodD0iMjAiIHJ4PSIyIi8+CiAgICA8cmVjdCB4PSIyMjAiIHk9IjIxMCIgd2lkdGg9IjM4IiBoZWlnaHQ9IjIwIiByeD0iMiIvPgogIDwvZz4KCiAgPCEtLSBkdXN0IGNsb3VkIC0tPgogIDxlbGxpcHNlIGN4PSI0MDAiIGN5PSIyMDUiIHJ4PSI1NSIgcnk9IjIwIiBmaWxsPSIjREZEOEM0IiBvcGFjaXR5PSIwLjciLz4KICA8ZWxsaXBzZSBjeD0iODAiIGN5PSIxOTUiIHJ4PSI0NSIgcnk9IjE2IiBmaWxsPSIjREZEOEM0IiBvcGFjaXR5PSIwLjYiLz4KPC9zdmc+Cg==",
    "Food waste": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI0VGRUFEOSIvPgogIDxyZWN0IHk9IjAiIHdpZHRoPSI1MDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRTlFNENFIi8+CiAgPHJlY3QgeT0iMTgwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iIzZCNEEyRSIvPgogIDxlbGxpcHNlIGN4PSIyNTAiIGN5PSIxODUiIHJ4PSIyNDAiIHJ5PSIxNiIgZmlsbD0iIzU2M0EyMiIvPgoKICA8IS0tIGJhbmFuYSBwZWVsIC0tPgogIDxwYXRoIGQ9Ik0xMTAgMjUwIFE5MCAyMDAgMTQwIDE5MCBRMTkwIDE5NSAxNzUgMjQwIFExNjAgMjcwIDEyMCAyNjUgUTEwMCAyNjAgMTEwIDI1MCBaIiBmaWxsPSIjQzk5QTNCIi8+CgogIDwhLS0gYXBwbGUgY29yZSAtLT4KICA8cGF0aCBkPSJNMjUwIDIxMCBRMjYwIDE5NSAyNzUgMjEwIFEyODUgMjQwIDI2NSAyNTUgUTI0NSAyNDAgMjUwIDIxMCBaIiBmaWxsPSIjRTdFMEM4Ii8+CiAgPGNpcmNsZSBjeD0iMjY0IiBjeT0iMjA1IiByPSI1IiBmaWxsPSIjNENBNzcyIi8+CgogIDwhLS0gb3JhbmdlIHBlZWwgY3VybCAtLT4KICA8cGF0aCBkPSJNMzQwIDIzMCBRMzgwIDIxMCA0MDAgMjQwIFEzODUgMjY1IDM1NSAyNjAgUTMzNSAyNTAgMzQwIDIzMCBaIiBmaWxsPSIjRDk3QjJFIi8+CgogIDwhLS0gdmVnZ2llIHNjcmFwcyAtLT4KICA8ZWxsaXBzZSBjeD0iMTgwIiBjeT0iMjgwIiByeD0iMjYiIHJ5PSIxMiIgZmlsbD0iIzRDQTc3MiIvPgogIDxlbGxpcHNlIGN4PSIzMjAiIGN5PSIyODUiIHJ4PSIyMiIgcnk9IjEwIiBmaWxsPSIjOEM1QTJCIi8+CgogIDwhLS0gZmxpZXMgLS0+CiAgPGNpcmNsZSBjeD0iMjMwIiBjeT0iMTcwIiByPSIzIiBmaWxsPSIjMUIyMTFEIi8+CiAgPGNpcmNsZSBjeD0iMjQ1IiBjeT0iMTYwIiByPSIzIiBmaWxsPSIjMUIyMTFEIi8+CiAgPGNpcmNsZSBjeD0iMzAwIiBjeT0iMTc1IiByPSIzIiBmaWxsPSIjMUIyMTFEIi8+Cjwvc3ZnPgo=",
    "Electronic waste": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI0U5RTlFQyIvPgogIDxyZWN0IHk9IjAiIHdpZHRoPSI1MDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjREVERUUzIi8+CiAgPHJlY3QgeT0iMTgwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iI0I5QjlCRSIvPgoKICA8IS0tIG9sZCBDUlQgbW9uaXRvciAtLT4KICA8cmVjdCB4PSI5MCIgeT0iMTgwIiB3aWR0aD0iMTQwIiBoZWlnaHQ9IjEwNSIgcng9IjgiIGZpbGw9IiMzQTNENDIiLz4KICA8cmVjdCB4PSIxMDUiIHk9IjE5MiIgd2lkdGg9IjExMCIgaGVpZ2h0PSI3MCIgcng9IjQiIGZpbGw9IiMxQjIxMUQiLz4KICA8cmVjdCB4PSIxMzAiIHk9IjI4NSIgd2lkdGg9IjYwIiBoZWlnaHQ9IjE0IiBmaWxsPSIjMkEyRDMxIi8+CgogIDwhLS0gdGFuZ2xlZCBjYWJsZXMgLS0+CiAgPHBhdGggZD0iTTI0MCAyNjAgUTI4MCAyMjAgMjYwIDE5MCBRMzIwIDIxMCAzMDAgMjUwIFEzNjAgMjM1IDM0MCAyMDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFCMjExRCIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KCiAgPCEtLSBjaXJjdWl0IGJvYXJkIC0tPgogIDxyZWN0IHg9IjMzMCIgeT0iMjMwIiB3aWR0aD0iOTAiIGhlaWdodD0iNjAiIHJ4PSI0IiBmaWxsPSIjMkU1QzNEIi8+CiAgPGNpcmNsZSBjeD0iMzUwIiBjeT0iMjUwIiByPSI0IiBmaWxsPSIjQzk5QTNCIi8+CiAgPGNpcmNsZSBjeD0iMzcwIiBjeT0iMjYwIiByPSI0IiBmaWxsPSIjQzk5QTNCIi8+CiAgPGNpcmNsZSBjeD0iMzkwIiBjeT0iMjQ1IiByPSI0IiBmaWxsPSIjQzk5QTNCIi8+CiAgPGxpbmUgeDE9IjM1MCIgeTE9IjI1MCIgeDI9IjM3MCIgeTI9IjI2MCIgc3Ryb2tlPSIjQzk5QTNCIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8bGluZSB4MT0iMzcwIiB5MT0iMjYwIiB4Mj0iMzkwIiB5Mj0iMjQ1IiBzdHJva2U9IiNDOTlBM0IiIHN0cm9rZS13aWR0aD0iMiIvPgoKICA8IS0tIGJhdHRlcnkgLS0+CiAgPHJlY3QgeD0iNjAiIHk9IjI1NSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjQwIiByeD0iMyIgZmlsbD0iI0IwNDcyQiIvPgogIDxyZWN0IHg9IjY1IiB5PSIyNTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSI2IiBmaWxsPSIjOEMyRTFCIi8+Cjwvc3ZnPgo=",
    "Other": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI0VGRUFEOSIvPgogIDxyZWN0IHk9IjAiIHdpZHRoPSI1MDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRTRFN0RFIi8+CiAgPHJlY3QgeT0iMTgwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iI0M5QkU5QyIvPgoKICA8IS0tIGdlbmVyaWMgYmluIC0tPgogIDxyZWN0IHg9IjIxMCIgeT0iMTUwIiB3aWR0aD0iOTAiIGhlaWdodD0iMTIwIiByeD0iMTAiIGZpbGw9IiM1RTZCNjMiLz4KICA8cmVjdCB4PSIyMDAiIHk9IjEzMiIgd2lkdGg9IjExMCIgaGVpZ2h0PSIyMiIgcng9IjYiIGZpbGw9IiM0QTU1NEUiLz4KCiAgPCEtLSBtaXhlZCBpdGVtcyBzY2F0dGVyZWQgYXJvdW5kIC0tPgogIDxyZWN0IHg9IjEyMCIgeT0iMjMwIiB3aWR0aD0iNTAiIGhlaWdodD0iMzQiIHJ4PSI0IiBmaWxsPSIjQzk5QTNCIiB0cmFuc2Zvcm09InJvdGF0ZSgtOCAxNDUgMjQ3KSIvPgogIDxlbGxpcHNlIGN4PSIzNTAiIGN5PSIyNTAiIHJ4PSIzOCIgcnk9IjI2IiBmaWxsPSIjMUIyMTFEIi8+CiAgPGNpcmNsZSBjeD0iOTAiIGN5PSIyNzAiIHI9IjE4IiBmaWxsPSIjQjA0NzJCIi8+CiAgPHJlY3QgeD0iMzMwIiB5PSIyMDAiIHdpZHRoPSIzMCIgaGVpZ2h0PSIyMCIgcng9IjMiIGZpbGw9IiM0Q0E3NzIiIHRyYW5zZm9ybT0icm90YXRlKDEyIDM0NSAyMTApIi8+CgogIDwhLS0gcXVlc3Rpb24gbWFya3MgKHVuY2xhc3NpZmllZCkgLS0+CiAgPHRleHQgeD0iMjU1IiB5PSIyMTUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjM0IiBmaWxsPSIjRjZGNEVFIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4/PC90ZXh0Pgo8L3N2Zz4K",
  };
  function wasteImage(wasteType) {
    return WASTE_IMAGES[wasteType] || WASTE_IMAGES.Other;
  }

  // Community + aggregated sample reports (demo data — see README).
  const SAMPLE_REPORTS = [
    {
      id: "r1", title: "Illegal dumping near community road",
      description: "Large amount of household waste dumped along the roadside, blocking part of the pavement.",
      latitude: -26.2041, longitude: 28.0473, province: "Gauteng", city: "Johannesburg",
      wasteType: "Illegal dumping", severity: "High", status: "Verified", verified: true,
      image: null, timestamp: daysAgoISO(2), source: "Community Report"
    },
    {
      id: "r2", title: "Overflowing bins at taxi rank",
      description: "Municipal bins have not been collected in over a week and waste is spreading.",
      latitude: -26.2708, longitude: 27.8620, province: "Gauteng", city: "Soweto",
      wasteType: "Household waste", severity: "Medium", status: "Reported", verified: false,
      image: null, timestamp: daysAgoISO(0.2), source: "Community Report"
    },
    {
      id: "r3", title: "Construction rubble dumped on vacant plot",
      description: "Rubble and building material dumped illegally on an open plot near a residential area.",
      latitude: -25.7479, longitude: 28.2293, province: "Gauteng", city: "Pretoria",
      wasteType: "Construction waste", severity: "Critical", status: "Cleanup In Progress", verified: true,
      image: null, timestamp: daysAgoISO(5), source: "Municipality"
    },
    {
      id: "r4", title: "Plastic waste along riverbank",
      description: "Significant plastic accumulation along the riverbank, likely washed down from upstream.",
      latitude: -33.9249, longitude: 18.4241, province: "Western Cape", city: "Cape Town",
      wasteType: "Plastic", severity: "High", status: "Verified", verified: true,
      image: null, timestamp: daysAgoISO(3), source: "Organisation"
    },
    {
      id: "r5", title: "Illegal dumping site behind shopping centre",
      description: "Recurring dumping spot behind a shopping centre, mostly household and food waste.",
      latitude: -33.9321, longitude: 18.8602, province: "Western Cape", city: "Stellenbosch",
      wasteType: "Illegal dumping", severity: "Medium", status: "Under Review", verified: false,
      image: null, timestamp: daysAgoISO(1), source: "Community Report"
    },
    {
      id: "r6", title: "Cleaned-up dumping ground now resolved",
      description: "Previously reported dumping ground has been cleared by a local volunteer group.",
      latitude: -29.8587, longitude: 31.0218, province: "KwaZulu-Natal", city: "Durban",
      wasteType: "Household waste", severity: "Low", status: "Resolved", verified: true,
      image: null, timestamp: daysAgoISO(14), source: "Organisation",
      impact: { wasteKg: 340, volunteers: 12, hours: 18 }
    },
    {
      id: "r7", title: "E-waste dumped near industrial area",
      description: "Old electronics and batteries dumped near an industrial site, potential contamination risk.",
      latitude: -29.6006, longitude: 30.3794, province: "KwaZulu-Natal", city: "Pietermaritzburg",
      wasteType: "Electronic waste", severity: "Critical", status: "Reported", verified: false,
      image: null, timestamp: daysAgoISO(0.5), source: "Community Report"
    },
    {
      id: "r8", title: "Beachfront litter after weekend event",
      description: "Litter left behind after a public event, mostly food packaging and plastic bottles.",
      latitude: -33.9608, longitude: 25.6022, province: "Eastern Cape", city: "Gqeberha",
      wasteType: "Plastic", severity: "Medium", status: "Cleanup Planned", verified: true,
      image: null, timestamp: daysAgoISO(4), source: "Public News"
    },
    {
      id: "r9", title: "Dumping near school grounds",
      description: "Waste dumped near a primary school, raising concerns from parents and teachers.",
      latitude: -33.0153, longitude: 27.9116, province: "Eastern Cape", city: "East London",
      wasteType: "Illegal dumping", severity: "High", status: "Verified", verified: true,
      image: null, timestamp: daysAgoISO(6), source: "Community Report"
    },
    {
      id: "r10", title: "Household waste along township road",
      description: "Ongoing dumping along an informal road, growing over the past month.",
      latitude: -29.0852, longitude: 26.1596, province: "Free State", city: "Bloemfontein",
      wasteType: "Household waste", severity: "Medium", status: "Reported", verified: false,
      image: null, timestamp: daysAgoISO(0.1), source: "Community Report"
    },
    {
      id: "r11", title: "Illegal dump site reported by local news",
      description: "A local news outlet reported a growing illegal dump site affecting a nearby stream.",
      latitude: -23.9045, longitude: 29.4689, province: "Limpopo", city: "Polokwane",
      wasteType: "Illegal dumping", severity: "High", status: "Under Review", verified: false,
      image: null, timestamp: daysAgoISO(2.5), source: "Public News"
    },
    {
      id: "r12", title: "Food waste dumping near market",
      description: "Market vendors' food waste dumped in a nearby field instead of being collected.",
      latitude: -25.4753, longitude: 30.9694, province: "Mpumalanga", city: "Mbombela",
      wasteType: "Food waste", severity: "Low", status: "Reported", verified: false,
      image: null, timestamp: daysAgoISO(1.2), source: "Community Report"
    },
    {
      id: "r13", title: "Mining-adjacent dumping ground",
      description: "Waste accumulating near a mining access road, reported by a community volunteer.",
      latitude: -25.6672, longitude: 27.2424, province: "North West", city: "Rustenburg",
      wasteType: "Illegal dumping", severity: "Critical", status: "Verified", verified: true,
      image: null, timestamp: daysAgoISO(7), source: "Community Report"
    },
    {
      id: "r14", title: "Resolved dumping site near reservoir",
      description: "A previously reported dumping site near the reservoir has been fully cleared.",
      latitude: -28.7282, longitude: 24.7499, province: "Northern Cape", city: "Kimberley",
      wasteType: "Construction waste", severity: "Low", status: "Resolved", verified: true,
      image: null, timestamp: daysAgoISO(20), source: "Municipality",
      impact: { wasteKg: 210, volunteers: 6, hours: 9 }
    },
    {
      id: "r15", title: "Plastic bags caught in stormwater drain",
      description: "Plastic bags and packaging blocking a stormwater drain, risk of local flooding.",
      latitude: -26.1900, longitude: 28.0300, province: "Gauteng", city: "Johannesburg",
      wasteType: "Plastic", severity: "Medium", status: "Cleanup In Progress", verified: true,
      image: null, timestamp: daysAgoISO(1.8), source: "Community Report"
    }
  ];

  // Fill in each sample report's image from its own waste type, now that
  // the array (and every report's wasteType) is fully defined above.
  SAMPLE_REPORTS.forEach((r) => { r.image = wasteImage(r.wasteType); });

  function daysAgoISO(days) {
    const d = new Date();
    d.setTime(d.getTime() - days * 86400000);
    return d.toISOString();
  }

  /* =======================================================================
     2. API ABSTRACTION LAYER
     Swap the implementation of these methods for real `fetch()` calls to a
     backend once one exists — nothing else in the app needs to change.
  ========================================================================= */

  const API = {
    async getReports() {
      await wait(250); // simulate network latency
      return [...SAMPLE_REPORTS, ...loadUserReports()];
    },
    async createReport(report) {
      await wait(300);
      const stored = loadUserReports();
      stored.push(report);
      saveUserReports(stored);
      return report;
    }
  };

  function wait(ms) { return new Promise((res) => setTimeout(res, ms)); }

  /* =======================================================================
     3. STATE & PERSISTENCE
     NOTE: localStorage is used only so the prototype "remembers" reports
     across a refresh. A production app would use a backend database,
     authentication and cloud image storage instead.
  ========================================================================= */

  const STORAGE_KEY = "cleanSAReports";

  function loadUserReports() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn("Could not read saved reports, starting fresh.", err);
      return [];
    }
  }

  function saveUserReports(reports) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (err) {
      console.warn("Could not save report locally.", err);
      showToast("⚠ Could not save your report locally", "warn");
    }
  }

  const state = {
    reports: [],
    filtered: [],
    filters: { province: "all", status: "all", severity: "all", source: "all", query: "" }
  };

  /* =======================================================================
     4. UTILITY HELPERS
  ========================================================================= */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }

  function severityColor(sev) {
    return { Low: "#4CA772", Medium: "#C99A3B", High: "#B0472B", Critical: "#8C2E1B" }[sev] || "#5E6B63";
  }

  function statusMarkerColor(report) {
    if (report.severity === "Critical" && report.status !== "Resolved") return "#B0472B";
    switch (report.status) {
      case "Verified": return "#1F6B45";
      case "Cleanup In Progress": return "#6C8FBF";
      case "Resolved": return "#4CA772";
      default: return "#C99A3B"; // Reported / Under Review / Cleanup Planned
    }
  }

  function sourceBadge(report) {
    if (report.verified) return { cls: "badge-verified", label: "✓ Verified" };
    if (report.source === "Public News") return { cls: "badge-news", label: "Public News" };
    if (report.source === "Community Report") return { cls: "badge-community", label: "Community Report" };
    return { cls: "badge-pending", label: "Pending Verification" };
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function nearestPlace(lat, lng) {
    let best = null, bestDist = Infinity;
    KNOWN_PLACES.forEach((p) => {
      const d = haversine(lat, lng, p.lat, p.lng);
      if (d < bestDist) { bestDist = d; best = p; }
    });
    return { place: best, distanceKm: bestDist };
  }

  /* =======================================================================
     5. MAP — Leaflet wrapper
     Kept in its own object so the underlying provider (Leaflet today) could
     be swapped for Google Maps / Mapbox without touching the rest of the app.
  ========================================================================= */

  const MapProvider = {
    map: null,
    markers: [],

    init(elementId) {
      this.map = L.map(elementId, { zoomControl: true, scrollWheelZoom: true })
        .setView([-28.8, 24.7], 5.4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18
      }).addTo(this.map);

      const loading = $("#mapLoading");
      this.map.whenReady(() => loading && loading.classList.add("hidden"));
      return this.map;
    },

    clearMarkers() {
      this.markers.forEach((m) => this.map.removeLayer(m));
      this.markers = [];
    },

    buildIcon(report) {
      const color = statusMarkerColor(report);
      const pulse = report.severity === "Critical" && report.status !== "Resolved" ? " marker-critical-pulse" : "";
      return L.divIcon({
        className: "",
        html: `<span class="marker-pin${pulse}" style="background:${color}"></span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 24],
        popupAnchor: [0, -22]
      });
    },

    renderMarkers(reports, onView) {
      this.clearMarkers();
      reports.forEach((report) => {
        const marker = L.marker([report.latitude, report.longitude], { icon: this.buildIcon(report) });
        const badge = sourceBadge(report);
        marker.bindPopup(`
          <div class="popup-card">
            <img src="${report.image}" alt="" />
            <h4>${escapeHTML(report.title)}</h4>
            <p>📍 ${escapeHTML(report.city)}, ${escapeHTML(report.province)} · ${report.severity}</p>
            <button class="popup-view-btn" data-report-id="${report.id}">View Report</button>
          </div>
        `);
        marker.on("popupopen", (e) => {
          const btn = e.popup.getElement().querySelector(".popup-view-btn");
          if (btn) btn.addEventListener("click", () => onView(report.id));
        });
        marker.addTo(this.map);
        this.markers.push(marker);
      });
    },

    flyTo(lat, lng, zoom) {
      this.map.flyTo([lat, lng], zoom || 12, { duration: 0.8 });
    }
  };

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* =======================================================================
     6. RENDERING
  ========================================================================= */

  function renderStatsBand() {
    const submitted = state.reports.length;
    const verified = state.reports.filter((r) => r.verified).length;
    const resolved = state.reports.filter((r) => r.status === "Resolved").length;
    const locations = new Set(state.reports.map((r) => r.city)).size;
    const cleanupActive = state.reports.filter((r) => r.status === "Cleanup In Progress").length;

    const stats = [
      { value: submitted.toLocaleString("en-ZA"), label: "Reports submitted" },
      { value: locations.toLocaleString("en-ZA"), label: "Locations reported" },
      { value: verified.toLocaleString("en-ZA"), label: "Verified reports" },
      { value: cleanupActive.toLocaleString("en-ZA"), label: "Cleanups in progress" },
      { value: resolved.toLocaleString("en-ZA"), label: "Resolved" }
    ];

    $("#statsGrid").innerHTML = stats.map((s) => `
      <div class="stat-card">
        <div class="value">${s.value}</div>
        <div class="label">${s.label}</div>
      </div>
    `).join("");

    $("#chipReports").textContent = submitted.toLocaleString("en-ZA");
    $("#chipVerified").textContent = verified.toLocaleString("en-ZA");
  }

  function renderMiniStats() {
    const total = state.filtered.length;
    const verified = state.filtered.filter((r) => r.verified).length;
    const critical = state.filtered.filter((r) => r.severity === "Critical").length;

    $("#miniStats").innerHTML = `
      <div class="mini-stat-row"><span>Showing</span><strong>${total}</strong></div>
      <div class="mini-stat-row"><span>Verified</span><strong>${verified}</strong></div>
      <div class="mini-stat-row"><span>Critical</span><strong>${critical}</strong></div>
    `;

    const byProvince = {};
    const byWaste = {};
    state.reports.forEach((r) => {
      byProvince[r.province] = (byProvince[r.province] || 0) + 1;
      byWaste[r.wasteType] = (byWaste[r.wasteType] || 0) + 1;
    });
    const topProvince = Object.entries(byProvince).sort((a, b) => b[1] - a[1])[0];
    const topWaste = Object.entries(byWaste).sort((a, b) => b[1] - a[1])[0];
    $("#topProvince").textContent = topProvince ? topProvince[0] : "—";
    $("#topWasteType").textContent = topWaste ? topWaste[0] : "—";
  }

  function renderCards() {
    const grid = $("#reportsGrid");
    const empty = $("#emptyState");

    if (state.filtered.length === 0) {
      grid.innerHTML = "";
      empty.setAttribute("data-visible", "true");
      refreshIcons();
      return;
    }
    empty.setAttribute("data-visible", "false");

    const sorted = [...state.filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    grid.innerHTML = sorted.map((r) => {
      const badge = sourceBadge(r);
      return `
      <article class="report-card" data-id="${r.id}">
        <div class="card-media">
          <img src="${r.image}" alt="Photo submitted for: ${escapeHTML(r.title)}" loading="lazy" />
          <span class="card-severity-tag" style="background:${severityColor(r.severity)}">${r.severity}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHTML(r.title)}</h3>
          <div class="card-meta">
            <span><i data-lucide="map-pin" aria-hidden="true"></i>${escapeHTML(r.city)}, ${escapeHTML(r.province)}</span>
            <span><i data-lucide="clock" aria-hidden="true"></i>${timeAgo(r.timestamp)}</span>
          </div>
          <div class="badges">
            <span class="badge ${badge.cls}">${badge.label}</span>
            <span class="status-pill">${r.status}</span>
          </div>
          <p class="card-desc">${escapeHTML(truncate(r.description, 90))}</p>
          <div class="card-footer">
            <button class="view-map-link" data-view-id="${r.id}">
              View on map <i data-lucide="arrow-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </article>`;
    }).join("");

    refreshIcons();
  }

  function truncate(str, n) {
    if (!str) return "";
    return str.length > n ? str.slice(0, n).trim() + "…" : str;
  }

  function renderAll() {
    applyFilters();
    renderStatsBand();
    renderMiniStats();
    renderCards();
    MapProvider.renderMarkers(state.filtered, openDetails);
    populateProvinceFilter();
    // Let other modules (reports.js, analytics.js) know fresh data is in.
    document.dispatchEvent(new CustomEvent("cleansa:reportsChanged"));
  }

  function populateProvinceFilter() {
    const select = $("#filterProvince");
    if (select.dataset.populated) return;
    PROVINCES.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p; opt.textContent = p;
      select.appendChild(opt);
    });
    select.dataset.populated = "true";
  }

  /* =======================================================================
     7. FILTERING & SEARCH
  ========================================================================= */

  function applyFilters() {
    const { province, status, severity, source, query } = state.filters;
    const q = query.trim().toLowerCase();

    state.filtered = state.reports.filter((r) => {
      if (province !== "all" && r.province !== province) return false;
      if (status !== "all" && r.status !== status) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (source !== "all" && r.source !== source) return false;
      if (q) {
        const haystack = `${r.title} ${r.city} ${r.province} ${r.wasteType} ${r.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function wireFilters() {
    $("#filterProvince").addEventListener("change", (e) => { state.filters.province = e.target.value; renderFiltered(); });
    $("#filterStatus").addEventListener("change", (e) => { state.filters.status = e.target.value; renderFiltered(); });
    $("#filterSeverity").addEventListener("change", (e) => { state.filters.severity = e.target.value; renderFiltered(); });
    $("#filterSource").addEventListener("change", (e) => { state.filters.source = e.target.value; renderFiltered(); });

    let searchTimer;
    $("#searchInput").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      const value = e.target.value;
      searchTimer = setTimeout(() => {
        state.filters.query = value;
        renderFiltered();
      }, 200);
    });

    $("#resetFiltersBtn").addEventListener("click", () => {
      state.filters = { province: "all", status: "all", severity: "all", source: "all", query: "" };
      $("#filterProvince").value = "all";
      $("#filterStatus").value = "all";
      $("#filterSeverity").value = "all";
      $("#filterSource").value = "all";
      $("#searchInput").value = "";
      renderFiltered();
      showToast("Filters reset");
    });
  }

  function renderFiltered() {
    applyFilters();
    renderMiniStats();
    renderCards();
    MapProvider.renderMarkers(state.filtered, openDetails);
    if (state.filtered.length === 0) {
      // no results message already shown via empty state
    }
  }

  /* =======================================================================
     8. REPORT DETAILS MODAL
  ========================================================================= */

  function openDetails(id) {
    const report = state.reports.find((r) => r.id === id);
    if (!report) return;
    const badge = sourceBadge(report);

    const lifecycleHtml = STATUS_ORDER.map((step) => {
      const doneIndex = STATUS_ORDER.indexOf(report.status);
      const isDone = STATUS_ORDER.indexOf(step) <= doneIndex;
      return `<span class="lifecycle-step ${isDone ? "done" : ""}">${step}</span>`;
    }).join("");

    $("#detailsContent").innerHTML = `
      <img class="details-img" src="${report.image}" alt="Photo for report: ${escapeHTML(report.title)}" />
      <h2 class="details-title">${escapeHTML(report.title)}</h2>
      <div class="details-meta">
        <span><i data-lucide="map-pin" aria-hidden="true"></i>${escapeHTML(report.city)}, ${escapeHTML(report.province)}</span>
        <span><i data-lucide="calendar" aria-hidden="true"></i>Reported ${formatDate(report.timestamp)}</span>
        <span><i data-lucide="tag" aria-hidden="true"></i>${escapeHTML(report.wasteType)}</span>
      </div>
      <div class="details-badges">
        <span class="badge ${badge.cls}">${badge.label}</span>
        <span class="badge" style="background:${severityColor(report.severity)}22; color:${severityColor(report.severity)}">${report.severity} severity</span>
        <span class="badge badge-pending">${report.status}</span>
      </div>
      <p>${escapeHTML(report.description)}</p>

      <p class="details-section-label">Cleanup lifecycle</p>
      <div class="lifecycle">${lifecycleHtml}</div>

      <p class="details-section-label">Source</p>
      <p>${escapeHTML(report.source)}${report.demo ? " — demo submission" : " — prototype/demo data"}</p>

      <p class="details-section-label">Coordinates</p>
      <p>${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</p>

      <div class="details-actions">
        <button class="btn btn-secondary btn-sm" data-toast="✓ Update submitted for review"><i data-lucide="message-square-plus" aria-hidden="true"></i>Report an update</button>
        <button class="btn btn-secondary btn-sm" data-toast="✓ Link copied — share this report"><i data-lucide="share-2" aria-hidden="true"></i>Share</button>
        <button class="btn btn-secondary btn-sm" data-toast="✓ Report confirmed by another user"><i data-lucide="check-circle" aria-hidden="true"></i>Confirm issue</button>
        <button class="btn btn-primary btn-sm" data-toast="✓ Marked as resolved — thank you!"><i data-lucide="sparkles" aria-hidden="true"></i>Mark as resolved</button>
      </div>
    `;

    $("#detailsModal").hidden = false;
    document.body.style.overflow = "hidden";
    refreshIcons();
    MapProvider.flyTo(report.latitude, report.longitude, 13);
  }

  function closeDetails() {
    $("#detailsModal").hidden = true;
    document.body.style.overflow = "";
  }

  /* =======================================================================
     9. REPORT LITTER — MULTI-STEP FORM
  ========================================================================= */

  const reportDraft = {
    location: null, // { lat, lng, name, province }
    title: "", description: "", wasteType: "",
    severity: "", photoDataUrl: null
  };

  let currentStep = 1;
  const TOTAL_STEPS = 5;
  let pickMapInstance = null;
  let pickMarker = null;

  function openReportModal() {
    resetReportForm();
    $("#reportModal").hidden = false;
    document.body.style.overflow = "hidden";
    refreshIcons();
  }

  function closeReportModal() {
    $("#reportModal").hidden = true;
    document.body.style.overflow = "";
  }

  function resetReportForm() {
    currentStep = 1;
    reportDraft.location = null;
    reportDraft.title = ""; reportDraft.description = ""; reportDraft.wasteType = "";
    reportDraft.severity = ""; reportDraft.photoDataUrl = null;

    $("#reportForm").reset();
    $("#reportForm").hidden = false;
    $("#successState").hidden = true;
    $("#locationResult").hidden = true;
    $("#pickMapWrap").hidden = true;
    $("#uploadPreview").hidden = true;
    $("#uploadArea").hidden = false;
    $all(".severity-btn").forEach((b) => b.classList.remove("active"));
    $all(".location-btn").forEach((b) => b.classList.remove("active"));
    [$("#locationError"), $("#detailsError"), $("#severityError")].forEach((e) => (e.hidden = true));
    goToStep(1);
  }

  function goToStep(step) {
    currentStep = step;
    $all(".form-step").forEach((f) => f.classList.toggle("active", Number(f.dataset.step) === step));
    $all(".step-dot").forEach((d) => {
      const n = Number(d.dataset.step);
      d.classList.toggle("active", n === step);
      d.classList.toggle("completed", n < step);
    });
    $("#prevStepBtn").hidden = step === 1;
    $("#nextStepBtn").hidden = step === TOTAL_STEPS;
    $("#submitReportBtn").hidden = step !== TOTAL_STEPS;
    if (step === TOTAL_STEPS) renderSummary();
  }

  function validateStep(step) {
    if (step === 1) {
      const ok = !!reportDraft.location;
      $("#locationError").hidden = ok;
      return ok;
    }
    if (step === 2) {
      reportDraft.title = $("#reportTitle").value.trim();
      reportDraft.description = $("#reportDescription").value.trim();
      reportDraft.wasteType = $("#wasteType").value;
      const ok = reportDraft.title && reportDraft.description && reportDraft.wasteType;
      $("#detailsError").hidden = !!ok;
      return !!ok;
    }
    if (step === 3) {
      const ok = !!reportDraft.severity;
      $("#severityError").hidden = ok;
      return ok;
    }
    return true; // photo optional, summary has nothing to validate
  }

  function renderSummary() {
    const loc = reportDraft.location;
    $("#summaryCard").innerHTML = `
      <dl>
        <dt>Title</dt><dd>${escapeHTML(reportDraft.title)}</dd>
        <dt>Location</dt><dd>${escapeHTML(loc.name)} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})</dd>
        <dt>Waste type</dt><dd>${escapeHTML(reportDraft.wasteType)}</dd>
        <dt>Severity</dt><dd>${escapeHTML(reportDraft.severity)}</dd>
        <dt>Description</dt><dd>${escapeHTML(reportDraft.description)}</dd>
      </dl>
      ${reportDraft.photoDataUrl ? `<img src="${reportDraft.photoDataUrl}" alt="Uploaded photo preview" />` : ""}
    `;
  }

  function setLocation(loc) {
    reportDraft.location = loc;
    $("#locationResult").hidden = false;
    $("#locationResultName").textContent = loc.name;
    $("#locationResultCoords").textContent = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    $("#locationError").hidden = true;
  }

  function wireLocationStep() {
    $("#useLocationBtn").addEventListener("click", () => {
      if (!navigator.geolocation) {
        showToast("⚠ Geolocation is not supported on this device", "warn");
        return;
      }
      $("#useLocationBtn").classList.add("active");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const { place, distanceKm } = nearestPlace(latitude, longitude);
          const name = place && distanceKm < 60 ? `Near ${place.name}` : "Your current location";
          setLocation({ lat: latitude, lng: longitude, name, province: place ? place.province : "" });
          showToast("✓ Location captured");
        },
        () => {
          showToast("⚠ Location access denied — try searching or dropping a pin instead", "warn");
          $("#useLocationBtn").classList.remove("active");
        }
      );
    });

    $("#locationSearchInput").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) return;
      const match = KNOWN_PLACES.find((p) => p.name.toLowerCase().includes(q));
      if (match) setLocation({ lat: match.lat, lng: match.lng, name: match.name, province: match.province });
    });

    $("#dropPinBtn").addEventListener("click", () => {
      $("#dropPinBtn").classList.add("active");
      $("#pickMapWrap").hidden = false;
      if (!pickMapInstance) {
        pickMapInstance = L.map("pickMap").setView([-28.8, 24.7], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(pickMapInstance);
        pickMapInstance.on("click", (e) => {
          const { lat, lng } = e.latlng;
          if (pickMarker) pickMapInstance.removeLayer(pickMarker);
          pickMarker = L.marker([lat, lng]).addTo(pickMapInstance);
          const { place, distanceKm } = nearestPlace(lat, lng);
          const name = place && distanceKm < 60 ? `Near ${place.name}` : "Custom pin location";
          setLocation({ lat, lng, name, province: place ? place.province : "" });
        });
      }
      setTimeout(() => pickMapInstance.invalidateSize(), 100);
    });
  }

  function wireSeverityStep() {
    $all(".severity-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $all(".severity-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        reportDraft.severity = btn.dataset.value;
        $("#severityError").hidden = true;
      });
    });
  }

  function wirePhotoUpload() {
    const area = $("#uploadArea");
    const input = $("#photoInput");

    area.addEventListener("click", () => input.click());
    area.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });

    ["dragover", "dragenter"].forEach((evt) =>
      area.addEventListener(evt, (e) => { e.preventDefault(); area.classList.add("dragover"); })
    );
    ["dragleave", "drop"].forEach((evt) =>
      area.addEventListener(evt, (e) => { e.preventDefault(); area.classList.remove("dragover"); })
    );
    area.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file) handlePhotoFile(file);
    });
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handlePhotoFile(file);
    });

    $("#removePhotoBtn").addEventListener("click", () => {
      reportDraft.photoDataUrl = null;
      input.value = "";
      $("#uploadPreview").hidden = true;
      $("#uploadArea").hidden = false;
    });
  }

  function handlePhotoFile(file) {
    if (!file.type.startsWith("image/")) {
      showToast("⚠ Please choose an image file", "warn");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast("⚠ Image is too large (max 8MB for this prototype)", "warn");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      reportDraft.photoDataUrl = reader.result;
      $("#previewImg").src = reader.result;
      $("#uploadPreview").hidden = false;
      $("#uploadArea").hidden = true;
    };
    reader.onerror = () => showToast("⚠ Could not read that image", "warn");
    reader.readAsDataURL(file);
  }

  function wireFormNav() {
    $("#nextStepBtn").addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
    });
    $("#prevStepBtn").addEventListener("click", () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    });

    $("#reportForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

      const submitBtn = $("#submitReportBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";

      const loc = reportDraft.location;
      const newReport = {
        id: "user-" + Date.now(),
        title: reportDraft.title,
        description: reportDraft.description,
        latitude: loc.lat,
        longitude: loc.lng,
        province: loc.province || guessProvince(loc.lat, loc.lng),
        city: loc.name.replace(/^Near /, ""),
        wasteType: reportDraft.wasteType,
        severity: reportDraft.severity,
        status: "Reported",
        verified: false,
        image: reportDraft.photoDataUrl || wasteImage(reportDraft.wasteType),
        timestamp: new Date().toISOString(),
        source: "Community Report",
        demo: true
      };

      try {
        await API.createReport(newReport);
        state.reports.push(newReport);
        renderAll();
        MapProvider.flyTo(newReport.latitude, newReport.longitude, 12);
        $("#reportForm").hidden = true;
        $("#successState").hidden = false;
        refreshIcons();
        showToast("✓ Report submitted successfully");
      } catch (err) {
        console.error(err);
        showToast("⚠ Something went wrong — please try again", "warn");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit report";
      }
    });

    $("#successCloseBtn").addEventListener("click", closeReportModal);
  }

  function guessProvince(lat, lng) {
    return nearestPlace(lat, lng).place?.province || "Gauteng";
  }

  /* =======================================================================
     10. TOASTS
  ========================================================================= */

  function showToast(message, type) {
    const container = $("#toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast" + (type === "warn" ? " toast-warn" : "");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  function wireGenericToastButtons() {
    document.body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-toast]");
      if (btn) showToast(btn.dataset.toast);
    });
  }

  /* =======================================================================
     11. NAVBAR / GENERAL UI WIRING
  ========================================================================= */

  function wireNav() {
    const hamburger = $("#hamburgerBtn");
    const menu = $("#mobileMenu");
    hamburger.addEventListener("click", () => {
      const isHidden = menu.hidden;
      menu.hidden = !isHidden;
      hamburger.setAttribute("aria-expanded", String(isHidden));
    });
    $all(".mobile-menu a").forEach((a) => a.addEventListener("click", () => { menu.hidden = true; }));

    $("#mobileReportBtn").addEventListener("click", () => { menu.hidden = true; openReportModal(); });
    $("#navReportBtn").addEventListener("click", openReportModal);
    $("#heroReportBtn").addEventListener("click", openReportModal);
    $("#emptyReportBtn").addEventListener("click", openReportModal);
    $("#footerReportLink").addEventListener("click", (e) => { e.preventDefault(); openReportModal(); });
    $("#heroExploreBtn").addEventListener("click", () => {
      $("#map-section").scrollIntoView({ behavior: "smooth" });
    });
  }

  function wireModals() {
    $("#detailsCloseBtn").addEventListener("click", closeDetails);
    $("#reportCloseBtn").addEventListener("click", closeReportModal);

    [$("#detailsModal"), $("#reportModal")].forEach((overlay) => {
      overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; document.body.style.overflow = ""; });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!$("#detailsModal").hidden) closeDetails();
        if (!$("#reportModal").hidden) closeReportModal();
      }
    });
  }

  function wireCardMapLinks() {
    $("#reportsGrid").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view-id]");
      if (btn) {
        openDetails(btn.dataset.viewId);
        $("#map-section").scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  function wireLocateControl() {
    $("#locateBtn").addEventListener("click", () => {
      if (!navigator.geolocation) {
        showToast("⚠ Geolocation is not supported on this device", "warn");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          MapProvider.flyTo(pos.coords.latitude, pos.coords.longitude, 12);
          showToast("✓ Centred map on your location");
        },
        () => showToast("⚠ Location access denied", "warn")
      );
    });
  }

  /* =======================================================================
     12. INIT
  ========================================================================= */

  async function init() {
    MapProvider.init("leafletMap");
    wireFilters();
    wireNav();
    wireModals();
    wireCardMapLinks();
    wireLocateControl();
    wireLocationStep();
    wireSeverityStep();
    wirePhotoUpload();
    wireFormNav();
    wireGenericToastButtons();

    try {
      state.reports = await API.getReports();
    } catch (err) {
      console.error("Failed to load reports", err);
      state.reports = SAMPLE_REPORTS;
      showToast("⚠ Could not load latest reports — showing cached data", "warn");
    }

    renderAll();
    refreshIcons();
  }

  document.addEventListener("DOMContentLoaded", init);

  /* =======================================================================
     PUBLIC BRIDGE — read-only access for the Reports & Analytics subsystem
     (reports.js). Kept deliberately small: reports.js never reaches into
     this module's internals, it only ever reads through this object.
  ========================================================================= */
  window.CleanSAData = {
    getAllReports: () => state.reports.slice(),
    getMapInstance: () => MapProvider.map,
    PROVINCES: PROVINCES.slice(),
    STATUS_ORDER: STATUS_ORDER.slice(),
    WASTE_TYPES: WASTE_TYPES.slice(),
    escapeHTML,
    formatDate,
    timeAgo,
    showToast
  };
})();
