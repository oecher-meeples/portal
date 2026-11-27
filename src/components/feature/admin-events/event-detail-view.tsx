import { ShiftPlanPdfExportButton } from "@/components/feature/admin-events/shift-plan-pdf-export-button";
import { GuestImportDialog } from "@/components/feature/admin-events/guest-import-dialog";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { EventVisibility, HelperPhase } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EventMasterDataForm } from "@/components/feature/admin-events/event-master-data-form";
import type { HelperRoleOption } from "@/components/feature/admin-events/shift-dialog";
import {
  ShiftTableSection,
  type ShiftRow,
} from "@/components/feature/admin-events/shift-table-section";
import {
  ShelfAssignmentSection,
  type ShelfOption,
} from "@/components/feature/admin-events/shelf-assignment-section";
import {
  EventDayTimeForm,
  type EditableEventDay,
} from "@/components/feature/admin-events/event-day-time-form";
import { ShiftPlanEditor } from "@/components/feature/admin-events/shift-plan-editor";
import type { PlanShift, PlanBooking } from "@/lib/events/shift-plan-types";
import type { PoolMeeple } from "@/components/feature/admin-events/helper-pool-bar";
import { HelperOverviewSection } from "@/components/feature/admin-events/helper-overview-section";
import type { HelperOverviewGroup } from "@/lib/events/helper-overview";
import { PageContainer } from "@/components/ui/page-container";

export type { ShiftRow };

export function EventDetailView({
  eventId,
  eventTitle,
  eventStartsAt,
  eventEndsAt,
  eventLocation,
  eventHelperPhase,
  eventVisibility,
  days,
  shifts,
  helperRoles,
  helperOverview,
  pool,
  bookingsByDay,
  assignedShelves,
  availableShelves,
}: {
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventEndsAt: string | null;
  eventLocation: string | null;
  eventHelperPhase: HelperPhase;
  eventVisibility: EventVisibility;
  days: EditableEventDay[];
  shifts: ShiftRow[];
  helperRoles: HelperRoleOption[];
  helperOverview: HelperOverviewGroup[];
  pool: Record<string, PoolMeeple[]>;
  bookingsByDay: Record<string, PlanBooking[]>;
  assignedShelves: ShelfOption[];
  availableShelves: ShelfOption[];
}) {
  const planShifts: PlanShift[] = shifts.map((shift) => ({
    id: shift.id,
    dayId: shift.dayId,
    roleId: shift.roleId,
    roleName: shift.roleName,
    capacity: shift.capacity,
    targetStartsAt: shift.targetStartsAt,
    targetEndsAt: shift.targetEndsAt,
  }));
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title={eventTitle}
        description="Schichten mit Zeitfenster, Kapazität und Füllstand."
      />

      {/* #459: `multiple` fehlte — ohne dieses Prop fällt base-ui nach der
          ersten Interaktion (z. B. Öffnungszeit speichern → revalidatePath)
          auf Einzelauswahl zurück, obwohl `defaultValue` initial mehrere
          Werte zeigt. */}
      <Accordion
        multiple
        defaultValue={["stammdaten", "schichten", "schichtplan"]}
        className="flex flex-col gap-3"
      >
        <AccordionItem
          value="stammdaten"
          className={cn(cardVariants({ size: "flush" }), "px-4")}
        >
          <AccordionTrigger className="font-serif text-lg font-bold hover:no-underline">
            Stammdaten
          </AccordionTrigger>
          <AccordionPanel>
            <div className="grid gap-6 pb-2 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Öffnungszeiten je Tag</h3>
                {days.map((day) => (
                  <EventDayTimeForm key={day.id} day={day} />
                ))}
              </div>
              {/* key: nach dem Speichern + Refresh den Formularstand neu
                  aus den frisch geladenen Stammdaten aufbauen. */}
              <EventMasterDataForm
                key={`${eventTitle}|${eventStartsAt}|${eventEndsAt}|${eventLocation}|${eventVisibility}|${eventHelperPhase}`}
                event={{
                  id: eventId,
                  title: eventTitle,
                  startsAt: eventStartsAt,
                  endsAt: eventEndsAt,
                  location: eventLocation,
                  helperPhase: eventHelperPhase,
                  visibility: eventVisibility,
                }}
              />
            </div>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem
          value="schichten"
          className={cn(cardVariants({ size: "flush" }), "px-4")}
        >
          <AccordionTrigger className="font-serif text-lg font-bold hover:no-underline">
            Schichten
          </AccordionTrigger>
          <AccordionPanel>
            <ShiftTableSection
              eventId={eventId}
              helperPhase={eventHelperPhase}
              days={days}
              shifts={shifts}
              helperRoles={helperRoles}
            />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem
          value="helfer"
          className={cn(cardVariants({ size: "flush" }), "px-4")}
        >
          <AccordionTrigger className="font-serif text-lg font-bold hover:no-underline">
            Helfer
          </AccordionTrigger>
          <AccordionPanel>
            <div className="mb-3">
              <GuestImportDialog
                eventId={eventId}
                days={days}
                helperRoles={helperRoles}
              />
            </div>
            <HelperOverviewSection groups={helperOverview} />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem
          value="schichtplan"
          className={cn(cardVariants({ size: "flush" }), "px-4")}
        >
          <AccordionTrigger className="font-serif text-lg font-bold hover:no-underline">
            Schichtplan
          </AccordionTrigger>
          {/* overflow-visible statt des Standard-overflow-hidden: sonst
              stickt der Tag-Tabs-Header (siehe ShiftPlanEditor) nicht relativ
              zur Seite, weil das Panel selbst zum nächsten Scroll-Container
              würde — kleine Unschönheit beim Ein-/Ausklappen zugunsten des
              funktionierenden Sticky-Headers. */}
          <AccordionPanel className="overflow-visible">
            <div className="mb-3 flex justify-end">
              <ShiftPlanPdfExportButton eventId={eventId} />
            </div>
            <ShiftPlanEditor
              eventId={eventId}
              days={days}
              shifts={planShifts}
              helperRoles={helperRoles}
              pool={pool}
              bookings={bookingsByDay}
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <ShelfAssignmentSection
        eventId={eventId}
        assignedShelves={assignedShelves}
        availableShelves={availableShelves}
      />
    </PageContainer>
  );
}
