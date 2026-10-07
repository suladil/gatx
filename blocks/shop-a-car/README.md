# shop-a-car

Custom form block. Purpose: "Shop a Car Request" — customers send a railcar to a shop for inspection, maintenance or repair.

## Authoring (Universal Editor)

Add **Shop A Car** to a section. All fields are optional:

- **Intro Text** — instructions shown above the form.
- **Confirmation Message** — shown after submitting. The first link becomes the main button (e.g. Return to Portal). Empty uses the default message, which links to `/portal`.
- **Request Details Page** — page opened after submitting (e.g. `/shop-a-car-request`, which uses the request-details block). Empty shows the confirmation on the form page instead.
- **Submission URL** — receives the request as a `multipart/form-data` POST (including attachments). Empty runs the form in demo mode: it validates and shows the confirmation, but nothing is sent.

The form fields themselves are fixed in code: Railcar Information (Railcar Number*, Customer / Company Name, Current Location), Service Request (Type of Service*, Requested Service Date*, Priority, Description*), Additional Information (Origin, Destination, attachments).

## Behaviour

- Railcar numbers must look like a reporting mark plus number (e.g. GATX 088325) and are upper-cased.
- The service date can't be in the past. Attachments are limited to 10 MB each.
- Submitted requests are kept in the browser (up to 20) for the Request Details page. `?edit=<request id>` reopens one in the form; the button becomes **Update Request** and Save for Later is hidden.
- **Save for Later** stores a draft in the browser (attachments are not saved) and restores it on the next visit.
