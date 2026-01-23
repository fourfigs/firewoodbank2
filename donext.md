# Firewood Bank - Development To-Do List

Generated from NOTES.md (1/22 updates)

## Progress Tracking
- [ ] DASHBOARD section
- [ ] PROFILE section
- [ ] CLIENTS TAB section
- [ ] INVENTORY section
- [ ] WORKORDERS section
- [ ] METRICS section
- [ ] FINANCES section
- [ ] WORKER DIRECTORY section
- [ ] REPORTS section
- [ ] ADMIN section
- [ ] STAFF section

---

## DASHBOARD

- [x] When clicking the plus to add an event, have the scheduling slide in under the calendar
- [x] Change "Notes from the Team" to "Updates"

**Status:** ✅ COMPLETE
**Notes:** 
- Changed EventCreationModal to support slide-in mode
- Added slideDown animation to CSS
- Panel now slides in under calendar when + button is clicked
- Changed "Notes form the Team" to "Updates" (also fixed typo) 

---

## PROFILE

- [ ] Make the information display in a more friendly layout
- [ ] New friendly layout with current info on the left
- [ ] Work history/upcoming deliveries and user stats above that

**Status:** Not started
**Notes:** 

---

## CLIENTS TAB

- [ ] If profile details are open and you do anything else (change tabs, open another client, create a new client, etc) close the details pane
- [ ] This should apply any time you open a details pane (include workorders and workers and any other details)
- [ ] Put the view details button on the right side of the client, inline
- [ ] Put a small + button on the left side (this plus is to create a workorder)
- [ ] Pressing ESC while any detail panes are open, will close it
- [ ] Pressing ESC while newsletter sidebar is open (will close it)
- [ ] Fix the tab order to tab in a sensible order of fields

**Status:** Not started
**Notes:** 

---

## INVENTORY

- [ ] Needs a details pane when item is double clicked
- [ ] Staff/admin can edit quantity in details pane
- [ ] Add up and down arrows by item quantity to add or remove stock
- [ ] The tools do not have a threshold
- [ ] Add tabs to sort according to item type
- [ ] If a new item is type "other", add a new category for the type entered (if other is selected, and I add something with type "clown supplies", it would create a new tab and add "clown supplies" to the dropdown)
- [ ] Any items that need restocked should appear on both the dashboard as well as the inventory page
- [ ] Any items with type "Tool" will be listed in a collapsible left sidebar like the newsletter

**Status:** Not started
**Notes:** 

---

## WORKORDERS

- [ ] Schedule date should be blank until scheduled with a driver assigned
- [ ] Workorder details should open as a sidebar like other detail panes
- [ ] If staff/admin the status should be a dropdown
- [ ] The driver list should populate with all available drivers with DL and driver flags
- [ ] If the client is also a worker, and they were assigned to the delivery, add those hours to the workers profile
- [ ] If a worker is created with the same details as a client, ask if they are the same and link them for tracking purposes
- [ ] When a workorder is made for a client who is also a worker, track the amount of wood tracked in the worker and client profile
- [ ] Make the workorder number convention be: Month 3 letter abbreviation (example Dec) + last 2 of year (example 25) + the number of the order sequential as 2 integers (example 01 for the first order, 34 for the 34th order) so it is mmmyy##

**Status:** Not started
**Notes:** 

---

## METRICS

- [ ] Estimated value should be calculated differently: each cord of split wood is worth $450, unsplit is ??$250?? (see if you can locate info for this number)
- [ ] In the future, there will be receipts for items entered, these will be added to costs

**Status:** Not started
**Notes:** 

---

## FINANCES

- [ ] When hours are added for admin/staff/employees, ask if these are billed hours or in-kind donation hours
- [ ] A volunteer hour is valued at $31, this can be its own column next to donations, with a totals column after that

**Status:** Not started
**Notes:** 

---

## WORKER DIRECTORY

- [ ] If a worker is a client or vice versa, put an icon on that worker and client account to show this
- [ ] If a worker suggests a change, it should show on the dashboard of staff and admins
- [ ] When the staff/admin opens it to view, it should show the old profile on left and new on right with any changes highlighted
- [ ] In worker details, place the worker metrics under their name
- [ ] Worker onboarding should have: first, last, DOB, physical address, mailing address same checkbox (mailing address fields showing only if unchecked), DOB, and the driver/HIPAA information
- [ ] Anyone who is a driver should have a special color, same with HIPAA certified. If both, top half one and bottom the other color to show they have both
- [ ] Each worker should be displayed like the first 2 lines: Name Bold, phone, credentials, schedule, hours, view details
- [ ] In the details sidebar, include a work history at the bottom
- [ ] Admin and staff should see an "add hours" button on everyone aside from admins
- [ ] Each volunteer hour can be counted as $31 in kind donation, tracked in metrics as in-kind volunteer hours. These are separate from any in-kind hours from admin, staff, employees. A checkbox on add hours to declare inkind if checked
- [ ] Profiles should have a "dispute hours" feature
- [ ] Profiles can build a wood credit if they are a client and a volunteer. 10 hours is equal to a cord of wood (for now). Track this as a volunteer wood credit and convert the hours to cords to the hundredths

**Status:** Not started
**Notes:** 

---

## REPORTS

- [ ] Clean up the reports. It only needs to track changes, not when pages are listed
- [ ] Rename the reports with clear names for people to understand
- [ ] Only visible to staff/admin

**Status:** Not started
**Notes:** 

---

## ADMIN

- [ ] MOTD is now "Updates", and can be added from dashboard if staff or admin
- [ ] Only add Updates from a + on the "Notes from the Team" (now "Updates")
- [ ] Change requests should be in a staff tab only visible for staff/admin
- [ ] Make the admin tab contain admin duties

**Status:** Not started
**Notes:** 

---

## STAFF

- [ ] Make a staff page with staff things

**Status:** Not started
**Notes:** 

---

## Implementation Notes

- Always commit after each successful step
- Commit at the end of each section and advise to test before continuing to the next section
- Mark items off as you go
- Make notes about implementation decisions
