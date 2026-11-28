"use client";

import { useId, useState } from "react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmAction } from "@/lib/confirm";
import {
  SECTION_TYPES,
  TEMPLATES,
  emptyExperience,
  emptySection,
  newId,
  type CvData,
  type CvSection,
  type SectionType,
  type TemplateId,
} from "@/lib/cv-maker/model";
import { cn } from "@/lib/utils";
import { Hints, RowActions, TextArea, TextField, fieldId, move } from "./fields";

export type Change = (edit: (draft: CvData) => void) => void;

/** A titled card in the editor. */
export function Panel({
  title,
  description,
  actions,
  children,
  id,
}: {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

const addButton =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

export function BasicsEditor({ cv, change }: { cv: CvData; change: Change }) {
  const { basics } = cv;
  const set = (key: Exclude<keyof CvData["basics"], "links">) => (value: string) => change((draft) => void (draft.basics[key] = value));
  return (
    <Panel title="Contact and summary" description="The top of your CV. Plain text only: no icons, so every system can read it.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Full name" value={basics.name} onChange={set("name")} target="basics.name" autoComplete="name" />
        <TextField label="Headline" value={basics.headline} onChange={set("headline")} target="basics.headline" placeholder="Senior Frontend Engineer" />
        <TextField label="Email" type="email" value={basics.email} onChange={set("email")} target="basics.email" autoComplete="email" />
        <TextField label="Phone" type="tel" value={basics.phone} onChange={set("phone")} target="basics.phone" placeholder="+92 300 1234567" autoComplete="tel" />
        <TextField label="Location" value={basics.location} onChange={set("location")} target="basics.location" placeholder="Lahore, Pakistan" className="sm:col-span-2" />
      </div>

      <div className="mt-4" id={fieldId("basics.links")}>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Links (LinkedIn, GitHub, portfolio)</p>
        <div className="grid gap-2">
          {basics.links.map((link, index) => (
            <div key={link.id} className="flex items-end gap-2">
              <TextField
                label="Address"
                value={link.url}
                placeholder="linkedin.com/in/you"
                onChange={(value) => change((draft) => void (draft.basics.links[index].url = value))}
                className="flex-1"
              />
              <RowActions
                label="link"
                onUp={index > 0 ? () => change((draft) => move(draft.basics.links, index, -1)) : undefined}
                onDown={index < basics.links.length - 1 ? () => change((draft) => move(draft.basics.links, index, 1)) : undefined}
                onRemove={() => change((draft) => void draft.basics.links.splice(index, 1))}
                className="pb-0.5"
              />
            </div>
          ))}
        </div>
        {basics.links.length < 6 && (
          <button
            type="button"
            className={cn(addButton, "mt-1 -ml-3")}
            onClick={() => change((draft) => void draft.basics.links.push({ id: newId(), label: "", url: "" }))}
          >
            <PlusIcon className="size-4" aria-hidden />
            Add a link
          </button>
        )}
        <Hints target="basics.links" />
      </div>

      <TextArea
        label="Summary"
        value={basics.summary}
        onChange={set("summary")}
        target="basics.summary"
        rows={3}
        placeholder="Frontend engineer with 7 years building React apps for remote-first teams. Cut load times by a third at…"
        className="mt-4"
      />
    </Panel>
  );
}

export function RemoteEditor({ cv, change }: { cv: CvData; change: Change }) {
  const set = (key: keyof CvData["remote"]) => (value: string) => change((draft) => void (draft.remote[key] = value));
  return (
    <Panel title="Remote work" description="What remote employers check first. Shown as a short section under your summary; leave it empty to skip it.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Time zone" value={cv.remote.timezone} onChange={set("timezone")} target="remote.timezone" placeholder="UTC+5 (Pakistan)" />
        <TextField label="Working hours" value={cv.remote.hours} onChange={set("hours")} target="remote.hours" placeholder="Overlaps 4 hours with CET" />
        <TextField
          label="Where you can work"
          value={cv.remote.authorization}
          onChange={set("authorization")}
          target="remote.authorization"
          placeholder="Contractor, any country; EU work permit"
          className="sm:col-span-2"
        />
        <TextArea
          label="Remote experience (optional)"
          value={cv.remote.experience}
          onChange={set("experience")}
          target="remote.experience"
          placeholder="5 years in fully remote teams across 6 time zones; comfortable working async."
          className="sm:col-span-2"
        />
      </div>
    </Panel>
  );
}

function BulletsEditor({
  bullets,
  onChange,
  label,
}: {
  bullets: { id: string; text: string }[];
  onChange: (edit: (list: { id: string; text: string }[]) => void) => void;
  label: string;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="grid gap-2">
        {bullets.map((bullet, index) => (
          <li key={bullet.id} className="flex items-start gap-1.5" id={fieldId(`bullet:${bullet.id}`)}>
            <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            <div className="min-w-0 flex-1">
              <TextArea
                label={`Bullet ${index + 1}`}
                hideLabel
                value={bullet.text}
                rows={1}
                placeholder="Led… / Built… / Cut… — with a number if you have one"
                onChange={(value) => onChange((list) => void (list[index].text = value))}
              />
              <Hints target={`bullet:${bullet.id}`} />
            </div>
            <RowActions
              label={`bullet ${index + 1}`}
              onUp={index > 0 ? () => onChange((list) => move(list, index, -1)) : undefined}
              onDown={index < bullets.length - 1 ? () => onChange((list) => move(list, index, 1)) : undefined}
              onRemove={() => onChange((list) => void list.splice(index, 1))}
              className="mt-0.5"
            />
          </li>
        ))}
      </ul>
      {bullets.length < 20 && (
        <button type="button" className={cn(addButton, "mt-1 -ml-3")} onClick={() => onChange((list) => void list.push({ id: newId(), text: "" }))}>
          <PlusIcon className="size-4" aria-hidden />
          Add a bullet
        </button>
      )}
    </div>
  );
}

function ItemCard({
  label,
  children,
  index,
  count,
  onMove,
  onRemove,
  id,
}: {
  label: string;
  children: React.ReactNode;
  index: number;
  count: number;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  id: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3 sm:p-4" id={fieldId(`item:${id}`)}>
      <div className="-mt-1 mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
        <RowActions
          label={label}
          onUp={index > 0 ? () => onMove(-1) : undefined}
          onDown={index < count - 1 ? () => onMove(1) : undefined}
          onRemove={onRemove}
        />
      </div>
      {children}
      <Hints target={`item:${id}`} />
    </div>
  );
}

function DatesFields({
  item,
  onChange,
  currentLabel,
}: {
  item: { start: string; end: string; current: boolean };
  onChange: (key: "start" | "end" | "current", value: string | boolean) => void;
  currentLabel: string;
}) {
  return (
    <>
      <TextField label="Start" value={item.start} onChange={(value) => onChange("start", value)} placeholder="Jan 2022" />
      <div>
        <TextField label="End" value={item.current ? "" : item.end} onChange={(value) => onChange("end", value)} placeholder={item.current ? "Present" : "Mar 2024"} />
        <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={item.current}
            onChange={(event) => onChange("current", event.target.checked)}
            className="size-3.5 accent-primary"
          />
          {currentLabel}
        </label>
      </div>
    </>
  );
}

/** One section of the CV, whatever its type. */
export function SectionEditor({
  section,
  index,
  count,
  change,
}: {
  section: CvSection;
  index: number;
  count: number;
  change: Change;
}) {
  const [open, setOpen] = useState(true);
  const edit = (fn: (draft: CvSection) => void) =>
    change((draft) => {
      const target = draft.sections.find((candidate) => candidate.id === section.id);
      if (target) fn(target);
    });
  const remove = async () => {
    const ok = await confirmAction({
      title: `Remove the ${section.title || SECTION_TYPES[section.type].label} section?`,
      description: "Everything in it will be removed from this CV.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (ok) change((draft) => void draft.sections.splice(index, 1));
  };

  let body: React.ReactNode = null;
  if (section.type === "experience" || section.type === "education") {
    const isJob = section.type === "experience";
    body = (
      <div className="grid gap-3">
        {section.items.map((item, itemIndex) => {
          const name = "role" in item ? item.role : item.degree;
          const set = (key: string, value: string | boolean) => edit((draft) => {
            if (draft.type === "experience" || draft.type === "education") (draft.items[itemIndex] as Record<string, unknown>)[key] = value;
          });
          return (
            <ItemCard
              key={item.id}
              id={item.id}
              label={[name, item.organisation].filter(Boolean).join(" · ") || (isJob ? "New role" : "New entry")}
              index={itemIndex}
              count={section.items.length}
              onMove={(by) => edit((draft) => void ((draft.type === "experience" || draft.type === "education") && move(draft.items as unknown[], itemIndex, by)))}
              onRemove={() => edit((draft) => void ((draft.type === "experience" || draft.type === "education") && draft.items.splice(itemIndex, 1)))}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label={isJob ? "Job title" : "Degree or qualification"}
                  value={name}
                  onChange={(value) => set(isJob ? "role" : "degree", value)}
                  placeholder={isJob ? "Frontend Engineer" : "BSc Computer Science"}
                />
                <TextField
                  label={isJob ? "Company" : "School or university"}
                  value={item.organisation}
                  onChange={(value) => set("organisation", value)}
                />
                <TextField label="Location" value={item.location} onChange={(value) => set("location", value)} placeholder={isJob ? "Remote" : "Lahore"} className="sm:col-span-2" />
                <DatesFields item={item} onChange={set} currentLabel={isJob ? "I work here now" : "Still studying"} />
              </div>
              <BulletsEditor
                label={isJob ? "What you did and achieved" : "Details (optional): honours, thesis, relevant courses"}
                bullets={item.bullets}
                onChange={(fn) => edit((draft) => {
                  if (draft.type === "experience" || draft.type === "education") fn(draft.items[itemIndex].bullets);
                })}
              />
            </ItemCard>
          );
        })}
        <button
          type="button"
          className={cn(addButton, "-ml-3 justify-self-start")}
          onClick={() =>
            edit((draft) => {
              if (draft.type === "experience") draft.items.push(emptyExperience());
              if (draft.type === "education") draft.items.push({ id: newId(), degree: "", organisation: "", location: "", start: "", end: "", current: false, bullets: [] });
            })
          }
        >
          <PlusIcon className="size-4" aria-hidden />
          {isJob ? "Add a role" : "Add an entry"}
        </button>
      </div>
    );
  } else if (section.type === "projects") {
    body = (
      <div className="grid gap-3">
        {section.items.map((item, itemIndex) => (
          <ItemCard
            key={item.id}
            id={item.id}
            label={item.name || "New project"}
            index={itemIndex}
            count={section.items.length}
            onMove={(by) => edit((draft) => void (draft.type === "projects" && move(draft.items, itemIndex, by)))}
            onRemove={() => edit((draft) => void (draft.type === "projects" && draft.items.splice(itemIndex, 1)))}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Name" value={item.name} onChange={(value) => edit((draft) => void (draft.type === "projects" && (draft.items[itemIndex].name = value)))} />
              <TextField label="Link (optional)" value={item.link} placeholder="github.com/you/project" onChange={(value) => edit((draft) => void (draft.type === "projects" && (draft.items[itemIndex].link = value)))} />
            </div>
            <BulletsEditor
              label="What it is and what you did"
              bullets={item.bullets}
              onChange={(fn) => edit((draft) => void (draft.type === "projects" && fn(draft.items[itemIndex].bullets)))}
            />
          </ItemCard>
        ))}
        <button
          type="button"
          className={cn(addButton, "-ml-3 justify-self-start")}
          onClick={() => edit((draft) => void (draft.type === "projects" && draft.items.push({ id: newId(), name: "", link: "", bullets: [{ id: newId(), text: "" }] })))}
        >
          <PlusIcon className="size-4" aria-hidden />
          Add a project
        </button>
      </div>
    );
  } else if (section.type === "skills") {
    body = (
      <div className="grid gap-3">
        {section.groups.map((group, groupIndex) => (
          <div key={group.id} className="flex items-start gap-2" id={fieldId(`item:${group.id}`)}>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <TextField
                label="Group (optional)"
                value={group.label}
                placeholder="Languages"
                onChange={(value) => edit((draft) => void (draft.type === "skills" && (draft.groups[groupIndex].label = value)))}
              />
              <TextArea
                label="Skills, separated by commas"
                value={group.skills}
                rows={1}
                placeholder="TypeScript, React, Node.js, PostgreSQL"
                onChange={(value) => edit((draft) => void (draft.type === "skills" && (draft.groups[groupIndex].skills = value)))}
              />
            </div>
            <RowActions
              label={group.label || `skills group ${groupIndex + 1}`}
              onUp={groupIndex > 0 ? () => edit((draft) => void (draft.type === "skills" && move(draft.groups, groupIndex, -1))) : undefined}
              onDown={groupIndex < section.groups.length - 1 ? () => edit((draft) => void (draft.type === "skills" && move(draft.groups, groupIndex, 1))) : undefined}
              onRemove={() => edit((draft) => void (draft.type === "skills" && draft.groups.splice(groupIndex, 1)))}
              className="mt-5"
            />
          </div>
        ))}
        <button
          type="button"
          className={cn(addButton, "-ml-3 justify-self-start")}
          onClick={() => edit((draft) => void (draft.type === "skills" && draft.groups.push({ id: newId(), label: "", skills: "" })))}
        >
          <PlusIcon className="size-4" aria-hidden />
          Add a group
        </button>
      </div>
    );
  } else {
    body = (
      <div className="grid gap-2">
        {section.items.map((item, itemIndex) => (
          <div key={item.id} className="flex items-start gap-2" id={fieldId(`item:${item.id}`)}>
            <TextArea
              label={`Line ${itemIndex + 1}`}
              hideLabel
              rows={1}
              value={item.text}
              className="flex-1"
              placeholder={section.type === "languages" ? "Urdu (native), English (fluent)" : "AWS Certified Developer, 2024"}
              onChange={(value) => edit((draft) => {
                if ("items" in draft && draft.type !== "experience" && draft.type !== "education" && draft.type !== "projects") draft.items[itemIndex].text = value;
              })}
            />
            <RowActions
              label={`line ${itemIndex + 1}`}
              onUp={itemIndex > 0 ? () => edit((draft) => void ("items" in draft && move(draft.items as unknown[], itemIndex, -1))) : undefined}
              onDown={itemIndex < section.items.length - 1 ? () => edit((draft) => void ("items" in draft && move(draft.items as unknown[], itemIndex, 1))) : undefined}
              onRemove={() => edit((draft) => void ("items" in draft && (draft.items as unknown[]).splice(itemIndex, 1)))}
              className="mt-0.5"
            />
          </div>
        ))}
        <button
          type="button"
          className={cn(addButton, "-ml-3 justify-self-start")}
          onClick={() => edit((draft) => {
            if (draft.type !== "experience" && draft.type !== "education" && draft.type !== "projects" && draft.type !== "skills") draft.items.push({ id: newId(), text: "" });
          })}
        >
          <PlusIcon className="size-4" aria-hidden />
          Add a line
        </button>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5" id={fieldId(`section:${section.id}`)}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Collapse section" : "Expand section"}
          className="mt-6 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronDownIcon className={cn("size-4 transition-transform duration-200", !open && "-rotate-90")} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <TextField
            label={`${SECTION_TYPES[section.type].label} section heading`}
            value={section.title}
            onChange={(value) => edit((draft) => void (draft.title = value))}
            target={`section:${section.id}`}
            className="[&_input]:font-semibold"
          />
        </div>
        <RowActions
          label={`${section.title || "this"} section`}
          onUp={index > 0 ? () => change((draft) => move(draft.sections, index, -1)) : undefined}
          onDown={index < count - 1 ? () => change((draft) => move(draft.sections, index, 1)) : undefined}
          onRemove={remove}
          className="mt-5"
        />
      </div>
      {open && <div className="mt-4">{body}</div>}
    </section>
  );
}

export function AddSection({ change }: { change: Change }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:border-foreground/30 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <PlusIcon className="size-4" aria-hidden />
        Add a section
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-60 rounded-xl p-1.5">
        {(Object.keys(SECTION_TYPES) as SectionType[]).map((type) => (
          <DropdownMenuItem key={type} className="rounded-lg px-2 py-1.5" onSelect={() => change((draft) => void draft.sections.push(emptySection(type)))}>
            {SECTION_TYPES[type].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "relative flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors duration-150 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
              value === option.value ? "border-primary bg-primary/10 font-semibold" : "hover:bg-muted",
            )}
            title={option.description}
          >
            <input type="radio" name={name} value={option.value} className="sr-only" checked={value === option.value} onChange={() => onChange(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function DesignEditor({ cv, change }: { cv: CvData; change: Change }) {
  const { design } = cv;
  return (
    <Panel title="Design" description="Both layouts are one column with standard headings, which hiring systems read reliably.">
      <div className="grid gap-4">
        <Choice<TemplateId>
          legend="Layout"
          value={design.template}
          options={(Object.keys(TEMPLATES) as TemplateId[]).map((id) => ({ value: id, label: TEMPLATES[id].label, description: TEMPLATES[id].description }))}
          onChange={(value) => change((draft) => void (draft.design.template = value))}
        />
        <div className="flex flex-wrap gap-6">
          <Choice
            legend="Paper"
            value={design.paper}
            options={[
              { value: "a4", label: "A4", description: "Most of the world" },
              { value: "letter", label: "US Letter", description: "The US and Canada" },
            ]}
            onChange={(value) => change((draft) => void (draft.design.paper = value))}
          />
          <Choice
            legend="Text size"
            value={design.fontSize}
            options={[
              { value: "10", label: "Small" },
              { value: "10.5", label: "Medium" },
              { value: "11", label: "Large" },
            ]}
            onChange={(value) => change((draft) => void (draft.design.fontSize = value))}
          />
        </div>
      </div>
    </Panel>
  );
}
