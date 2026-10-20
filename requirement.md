# MASTER PROMPT — KALSARA TRAVEL SHOWCASE

## Role & Objective

Act as a Senior Product Designer, Travel Industry Business Analyst, Frontend Architect, and Fullstack-minded Senior Engineer.

Build a **premium, production-quality, fully interactive Travel Agency Website & Operations Dashboard showcase** for Kalsara Digital Studio.

This project is intended to demonstrate Kalsara's capabilities in developing digital solutions for travel and tourism businesses.

The showcase must feel like a real commercial product, not a generic admin template, static landing page, or collection of disconnected UI screens.

**Primary objective:** Create an impressive sales demonstration that prospective travel operators can explore independently.

**Secondary objective:** Establish a clean, maintainable frontend architecture that can eventually be connected to a real backend.

Do not implement a production backend in this phase.

---

# 1. Product Definition

## Product Type

Hybrid Travel Operator Platform supporting three business models:

1. Open Trip — scheduled group departures with seat quotas.
2. Private Trip — predefined packages with flexible dates and group sizes.
3. Custom Trip — tailor-made itineraries based on customer requirements.

The platform consists of two interconnected experiences:

### A. Public Travel Website

A premium, consumer-facing travel website designed to attract customers, showcase destinations, communicate travel packages, and facilitate booking inquiries.

### B. Travel Operations Dashboard

A professional internal management application covering travel packages, destinations, departures, leads, bookings, customers, payments, and operational reporting.

Both experiences must share the same mock data and demonstrate realistic end-to-end business workflows.

## Showcase Scope

This is a **frontend-first interactive showcase**, not a live SaaS product.

Use:
- Realistic seeded mock data.
- Browser-based persistence.
- Simulated CRUD operations.
- Simulated business workflows.
- Reactive dashboard statistics.
- Functional navigation and forms.
- Realistic empty, loading, success, and error states.

Do not implement:
- Production backend APIs.
- Real payment processing.
- Real WhatsApp message sending.
- Real email delivery.
- Production authentication.
- Real customer data.
- Actual multi-tenant infrastructure.

Never present simulated operations as completed real-world transactions.

---

# 2. Technology Stack

Preferred stack:

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Motion for subtle animations
- Recharts for data visualization
- React Hook Form + Zod
- Zustand or another lightweight state solution where appropriate
- localStorage for browser persistence
- date-fns for date handling
- Vercel-compatible deployment

Before implementation:

1. Inspect the existing repository.
2. Identify the current framework, dependencies, architecture, and conventions.
3. Reuse suitable existing infrastructure.
4. Do not unnecessarily replace a working project.
5. If the repository is empty, initialize the recommended stack.

Create an abstraction layer between UI components and data persistence.

Suggested architecture:

```text
src/
  app/
    (public)/
    (dashboard)/
  components/
    public/
    dashboard/
    shared/
  features/
    destinations/
    packages/
    departures/
    inquiries/
    bookings/
    customers/
    payments/
    operations/
    reports/
  domain/
    entities/
    types/
    rules/
  repositories/
    interfaces/
    mock/
  services/
  data/
    fixtures/
  stores/
  lib/
```

The UI must not directly manipulate localStorage throughout individual components.

Use repository/service abstractions so that mock implementations can eventually be replaced with API implementations.

---

# 3. Brand & Visual Direction

## Travel Brand

Create a fictional but commercially believable Indonesian travel brand.

Suggested name: **NusaVista Journey**.

The brand should feel established, credible, modern, and premium without appearing excessively luxurious or inaccessible.

Do not use Kalsara as the consumer-facing travel agency name.

Kalsara should appear subtly as the digital development partner, for example in the footer or demo information.

Avoid invented claims such as official certifications, business licenses, awards, verified customer reviews, or years of operation.

All fictional company information and testimonials must be clearly treated as demonstration content.

## Public Website Visual Identity

Design direction:

**Cinematic Indonesian Travel + Premium Editorial + Modern Booking Experience**

Characteristics:
- Large destination photography.
- Strong typography hierarchy.
- Editorial compositions.
- Generous whitespace.
- Sophisticated navigation.
- Refined travel package cards.
- Subtle animations.
- Modern search and filter interactions.
- High-quality mobile experience.

Suggested palette:
- Deep ocean navy.
- Warm ivory or off-white.
- Muted turquoise.
- Subtle sand or champagne accents.

Avoid:
- Generic Bootstrap-like travel templates.
- Excessive gradients.
- Overloaded hero sections.
- Too many competing CTAs.
- Cheap-looking promotional badges.
- Excessive rounded cards.
- Repetitive stock imagery.
- Dense paragraphs.

Typography recommendation:
- DM Sans or Plus Jakarta Sans for UI.
- An elegant editorial display typeface for selected headings.

Use a consistent type scale and spacing system.

## Dashboard Visual Identity

The dashboard should feel like a modern B2B SaaS product.

Characteristics:
- Clean sidebar navigation.
- Compact but readable tables.
- Strong information hierarchy.
- Actionable overview.
- Consistent status badges.
- Useful filters.
- Clear detail pages.
- Drawer/modal patterns where appropriate.
- Professional forms.
- Responsive desktop and tablet layouts.

The public website and dashboard may use different visual systems while maintaining shared brand consistency.

Prioritize usability over decorative elements.

---

# 4. Public Website Requirements

Implement the following pages.

## 4.1 Homepage

Sections:

1. Header and navigation.
2. Cinematic destination hero.
3. Destination/package search.
4. Featured destinations.
5. Featured open trips.
6. Private and custom trip experiences.
7. Upcoming departures.
8. Why travel with us.
9. Travel inspiration/editorial content.
10. FAQ.
11. Final booking/inquiry CTA.
12. Footer.

The homepage must not feel like a long collection of identical card grids.

Use varied editorial layouts and visual storytelling.

## 4.2 Destinations

Features:
- Destination listing.
- Search.
- Region filters.
- Destination categories.
- Destination detail pages.
- Related packages.

Include Indonesian destinations such as:
- Labuan Bajo.
- Bali.
- Lombok.
- Raja Ampat.
- Bromo.
- Yogyakarta.
- Belitung.
- Nusa Penida.

## 4.3 Tour Packages

Support:
- Open Trip.
- Private Trip.
- Custom Trip inquiry.

Package listing must include:
- Search.
- Trip type filter.
- Destination filter.
- Duration filter.
- Price range filter.
- Sorting.
- Availability indicators.

## 4.4 Package Detail

This is one of the most important pages.

Include:
- Large image gallery.
- Package title and overview.
- Destination information.
- Duration.
- Trip type.
- Itinerary by day.
- Included/excluded facilities.
- Meeting point.
- Terms and conditions.
- Cancellation policy.
- Available departures.
- Pricing.
- Participant requirements.
- FAQ.
- Related packages.
- Sticky booking/inquiry panel.

For open trips, departure selection and remaining quota must work.

For private trips, users should be able to request their preferred dates and group size.

For custom trips, users should be able to describe their requirements.

## 4.5 Booking Experience

Implement three separate flows.

### Open Trip

Package → Departure → Participant Count → Traveler Information → Booking Summary → Simulated Confirmation.

### Private Trip

Package → Preferred Date → Group Size → Special Requirements → Inquiry/Quotation Request.

### Custom Trip

Destination Preferences → Travel Dates → Group Size → Budget Range → Interests → Request Summary → Submit Inquiry.

Use validation and clear progress indicators.

## 4.6 Additional Pages

Implement:
- About.
- Travel Guides / Articles.
- Contact.
- Booking confirmation.
- Inquiry confirmation.

All primary navigation links must work.

---

# 5. Dashboard Information Architecture

Use the following navigation groups.

## Overview
- Dashboard.

## Sales
- Inquiries & Leads.
- Bookings.
- Customers.

## Travel Management
- Tour Packages.
- Destinations.
- Departures.
- Trip Operations.

## Finance
- Payments.
- Invoices.
- HPP & Costing.

## Content
- Website Content.
- Articles.
- Testimonials.

## Analytics
- Reports.

## System
- Team & Roles.
- Settings.

Do not create empty placeholder pages for important navigation items.

If a feature is not fully implemented, provide a meaningful interactive demonstration and clearly identify its simulated scope.

---

# 6. Dashboard Modules

## 6.1 Overview

Create an actionable dashboard showing:

KPI cards:
- Total bookings.
- Booking value.
- New inquiries.
- Upcoming departures.
- Outstanding payments.
- Estimated trip profitability.

Operational widgets:
- Inquiries requiring follow-up.
- Upcoming departures.
- Payments due.
- Incomplete traveler information.
- Recent booking activity.
- Booking trends.
- Popular travel packages.

All statistics must be calculated from the shared mock data.

Avoid unrelated hardcoded KPI values.

## 6.2 Inquiry & Lead Management

Implement:
- Lead list.
- Kanban pipeline.
- Lead detail.
- Lead source.
- Customer contact information.
- Interested package.
- Follow-up notes.
- Next follow-up date.
- Assigned sales representative.
- Status history.
- Convert inquiry into booking.

Suggested pipeline:

New → Contacted → Quotation Sent → Negotiation → Won / Lost.

When a lead converts to a booking, preserve the relationship and avoid duplicate customer records.

## 6.3 Package Management

Implement:
- Package list.
- Create/edit package.
- Package type.
- Destination.
- Duration.
- Description.
- Itinerary builder.
- Included/excluded facilities.
- Gallery.
- Pricing.
- Publication status.
- Related departures.

Package publication changes should be reflected on the public website.

## 6.4 Departure Management

Implement:
- Departure calendar.
- Departure list.
- Create/edit departure.
- Assigned package.
- Departure and return dates.
- Capacity.
- Available seats.
- Booking count.
- Assigned guide.
- Departure status.
- Participant manifest.

Remaining quota must be derived from actual confirmed seat allocations, not manually entered as an unrelated number.

Prevent overbooking.

Define clear rules for when pending bookings reserve seats and when reservations expire or are released.

## 6.5 Booking Management

Implement:
- Booking list.
- Booking detail.
- Customer.
- Package.
- Departure.
- Travelers.
- Booking source.
- Booking status.
- Payment summary.
- Booking timeline.
- Cancellation simulation.

Use a coherent booking lifecycle.

Suggested statuses:
- Pending.
- Awaiting Payment.
- Confirmed.
- Completed.
- Cancelled.

Keep payment status separate from booking status.

## 6.6 Customer Management

Implement:
- Customer list.
- Customer profile.
- Contact details.
- Booking history.
- Inquiry history.
- Notes.
- Customer search.

## 6.7 Payment & Invoice Management

Implement:
- Payment records.
- DP/installments.
- Outstanding balance.
- Due dates.
- Payment status.
- Simulated manual payment verification.
- Invoice detail.
- Printable invoice.

Do not integrate a real payment gateway.

Clearly indicate that payments are simulated.

Financial calculations must remain consistent with bookings.

## 6.8 Trip Operations

Implement:
- Upcoming trips.
- Participant manifest.
- Operational checklist.
- Guide assignment.
- Vendor assignment.
- Trip status.
- Preparation progress.

Use realistic operational tasks such as:
- Confirm transportation.
- Confirm accommodation.
- Verify traveler information.
- Prepare itinerary.
- Confirm guide.
- Finalize participant manifest.

## 6.9 HPP & Costing

Build an interactive costing simulator.

Cost categories:
- Transportation.
- Accommodation.
- Meals.
- Guide.
- Entrance tickets.
- Activities.
- Documentation.
- Other operational expenses.

Support:
- Fixed costs per departure.
- Variable costs per traveler.
- Cost estimation based on participant count.
- Selling price.
- Estimated revenue.
- Total estimated cost.
- Gross profit.
- Gross margin.
- Markup.

Use mathematically correct formulas.

Clearly distinguish:
- Estimated profit.
- Realized profit.
- Margin.
- Markup.

Do not imply that estimated profit equals actual profit.

For the initial showcase, focus on understandable and visually compelling costing workflows.

## 6.10 Reports

Include:
- Booking trends.
- Sales by package.
- Popular destinations.
- Lead conversion.
- Departure occupancy.
- Outstanding payments.
- Estimated profitability.

Charts must use data derived from the shared repository.

Implement meaningful date filters.

## 6.11 Content Management

Allow administrators to simulate editing:
- Homepage featured packages.
- Destination highlights.
- Promotional banners.
- Articles.
- Testimonials.
- About page content.

Changes should be visible on the public website where applicable.

---

# 7. Shared Data Model

Design domain entities before building complex screens.

At minimum:

- Destination.
- TourPackage.
- ItineraryDay.
- Departure.
- Inquiry.
- Customer.
- Traveler.
- Booking.
- BookingTraveler.
- Payment.
- Invoice.
- Vendor.
- Guide.
- TripChecklist.
- CostItem.
- User.
- Role.

Important relationships:

- One destination can have multiple packages.
- One package can have multiple departures.
- One departure can have multiple bookings.
- One booking can contain multiple travelers.
- One customer can have multiple bookings.
- One booking can have multiple payments.
- One departure can have multiple operational cost items.

Private/custom trip requests may require a quotation before a confirmed booking.

Avoid forcing all three trip types into the same rigid lifecycle.

Use stable IDs and coherent relationships.

---

# 8. Mock Data Strategy

Seed realistic Indonesian travel business data.

Minimum target dataset:

- 8 destinations.
- 15–20 travel packages.
- 20–30 departures.
- 40–60 customers.
- 30–50 bookings.
- 20–30 inquiries.
- Related payments and invoices.
- Guides and vendors.
- Operational checklists.
- Costing examples.

Use Indonesian names, realistic dates, plausible package prices, and IDR currency formatting.

Seed upcoming departures relative to the current date rather than hardcoding dates that quickly become obsolete.

Provide enough data to demonstrate:
- Different booking statuses.
- Fully booked departures.
- Upcoming trips.
- Pending payments.
- Lost inquiries.
- Profitable and low-margin packages.

All mock data must be internally consistent.

---

# 9. Interactive Showcase Requirements

The following actions must work:

1. Search and filter packages.
2. View destination details.
3. Select an open-trip departure.
4. Submit a simulated booking.
5. View the booking in the dashboard.
6. Update booking status.
7. Record a simulated payment.
8. See payment totals update.
9. Create a new travel package.
10. Publish the package.
11. See it appear on the public website.
12. Update a departure's capacity.
13. See availability update.
14. Submit a private/custom inquiry.
15. View the inquiry in the dashboard.
16. Move an inquiry through the pipeline.
17. Convert an inquiry into a booking.
18. Edit website content.
19. See relevant dashboard statistics update.
20. Reset demo data.

Use a single shared client-side data source.

Do not create isolated fake states that cannot interact across modules.

For persistence, use a browser-local repository with versioned storage and migration/reset support.

Because this showcase has no backend, changes only need to persist within the same browser environment. Do not imply that data synchronizes across different users or devices.

---

# 10. Showcase Demo Experience

Add a visible but unobtrusive **Demo Mode** indicator in the dashboard.

Provide:
- Explore Public Website.
- Explore Dashboard.
- Reset Demo Data.
- Demo Guide / Suggested Journey.

If possible, include a guided demo flow:

1. Explore travel packages.
2. Create a booking.
3. Open the dashboard.
4. Review the booking.
5. Update payment.
6. Review the departure.
7. View updated statistics.

No production login is required.

Do not collect real sensitive personal information in the demo.

Use fictional customer identities.

---

# 11. Responsive UX

Public website:
- Mobile-first.
- Excellent mobile navigation.
- Responsive package cards.
- Sticky booking CTA on mobile.
- Accessible forms.
- Optimized image layouts.

Dashboard:
- Desktop-first but usable on mobile.
- Collapsible sidebar.
- Responsive tables.
- Mobile-friendly detail views.
- Functional forms and dialogs.

Avoid horizontal overflow and tiny unreadable text.

---

# 12. Quality Requirements

## Visual Quality

The website must look like a professionally designed travel brand.

The dashboard must look like a credible B2B travel operations product.

Use consistent:
- Spacing.
- Typography.
- Color tokens.
- Form controls.
- Buttons.
- Tables.
- Cards.
- Empty states.
- Loading states.
- Status indicators.

Do not rely on default component library styling without customization.

## Functional Quality

- No broken links.
- No dead buttons.
- No non-functional primary forms.
- No contradictory booking statuses.
- No negative seat availability.
- No inconsistent financial totals.
- No console errors.
- No hydration errors.
- No TypeScript errors.
- No unnecessary dependencies.

## Accessibility

- Semantic HTML.
- Accessible labels.
- Keyboard navigation.
- Visible focus states.
- Sufficient contrast.
- Accessible modal interactions.

## Performance

- Optimize images.
- Use lazy loading where appropriate.
- Minimize unnecessary client-side JavaScript.
- Avoid heavy animation.
- Keep dashboard interactions responsive.

---

# 13. Implementation Strategy

Work in deliberate phases.

## Phase 0 — Repository Audit & Planning

Inspect the repository and create:

- Product architecture summary.
- Route map.
- Domain model.
- Component structure.
- Design system proposal.
- Implementation checklist.

If the repository already contains code, identify what should be reused or refactored.

## Phase 1 — Foundation

Implement:
- Project structure.
- Design tokens.
- Shared components.
- Repository interfaces.
- Mock data.
- Browser persistence.
- Navigation layouts.

## Phase 2 — Public Website

Build the premium public-facing experience.

Prioritize:
- Homepage.
- Package listing.
- Package detail.
- Destination pages.
- Booking/inquiry flows.

## Phase 3 — Dashboard Core

Build:
- Overview.
- Packages.
- Departures.
- Bookings.
- Inquiries.
- Customers.

## Phase 4 — Operations & Finance

Build:
- Payments.
- Invoices.
- Trip operations.
- HPP simulator.
- Reports.

## Phase 5 — Content & Demo Integration

Implement:
- Content management.
- Public/dashboard synchronization.
- Demo reset.
- Guided demo.

## Phase 6 — QA & Polish

Perform:
- Functional walkthroughs.
- Responsive review.
- Accessibility checks.
- Data consistency validation.
- Build verification.
- Visual refinement.

Do not stop after generating the architecture or design specification.

Proceed with implementation unless a genuine blocking decision requires clarification.

---

# 14. Acceptance Criteria

The showcase is complete only when:

1. The public website is visually polished and responsive.
2. All primary navigation works.
3. Travel packages can be searched and filtered.
4. Open-trip booking works as a simulation.
5. Private/custom inquiry works as a simulation.
6. Dashboard CRUD interactions work.
7. Data persists across refresh in the same browser.
8. Public website and dashboard share consistent data.
9. Booking and payment calculations are correct.
10. Departure capacity and availability are coherent.
11. Dashboard KPIs react to relevant data changes.
12. Demo data can be reset.
13. No important menu leads to an empty placeholder.
14. TypeScript and production build pass.
15. The project can deploy to Vercel.

---

# 15. Final Deliverables

Provide:

1. Working source code.
2. README with setup and deployment instructions.
3. Architecture overview.
4. Route map.
5. Domain model documentation.
6. Demo journey instructions.
7. Feature completion checklist.
8. Known limitations.
9. Future backend integration recommendations.

---

# 16. Final Instruction

Treat this project as a flagship Kalsara portfolio showcase.

Do not optimize merely for the number of pages or features.

Optimize for:
- Strong first impression.
- Premium visual execution.
- Realistic travel business workflows.
- Functional interconnected interactions.
- Credible dashboard UX.
- Maintainable frontend architecture.
- A convincing end-to-end sales demonstration.

The final result should make a prospective travel business owner think:

**“This is the kind of website and operational system I want for my business.”**

Start by inspecting the repository, establishing the architecture and design direction, and then implement the complete showcase in phases.
