# request-details

Custom block. Purpose: shows a submitted Shop a Car request with all its details and a **Modify Request** button.

## Authoring (Universal Editor)

Add **Request Details** to a section. All fields are optional:

- **No Request Message** — shown when there is no request to display.
- **Form Page** — the Shop a Car form page; Modify Request opens it with `?edit=<request id>`. Defaults to `/shop-a-car`.
- **Return Page** — target of the Return to Portal button. Defaults to `/portal`.

On the Shop a Car form, set **Request Details Page** to this page so submitting opens it.

## Behaviour

- Shows the request from `?id=<request id>`, or the most recent one when no id is given.
- `?submitted=1` / `?updated=1` (added by the form) show a "Request received" / "Changes saved" notice.
- Requests are stored in the customer's browser by the shop-a-car block (up to 20). They are only visible on the device that submitted them until a request system is connected.
