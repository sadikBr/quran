"use client";

import {
    Check,
    FileText,
    LoaderCircle,
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    UserRoundPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MeetingScheduleFields from "@/features/groups/components/meeting-schedule-fields";
import type { MeetingScheduleSlot } from "@/features/groups/meeting-types";
import createGroup from "@/features/groups/server/create-group";
import {
    deleteCircle,
    replaceSupervisor,
    searchSupervisorCandidates,
    updateCircle,
} from "../server/actions";
import AdminDialog from "./admin-dialog";

type Candidate = { id: string; name: string; email: string };

function SupervisorPicker({
    value,
    onChange,
    disabled,
    optional = false,
}: {
    value: Candidate | null;
    onChange: (value: Candidate | null) => void;
    disabled: boolean;
    optional?: boolean;
}) {
    const t = useTranslations("Admin");
    const id = useId();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Candidate[]>([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const revision = useRef(0);
    async function search() {
        const current = ++revision.current;
        setSearching(true);
        try {
            const candidates = await searchSupervisorCandidates(query);
            if (current === revision.current) {
                setResults(candidates);
                setSearched(true);
            }
        } catch {
            toast.error(t("failed"));
        } finally {
            if (current === revision.current) setSearching(false);
        }
    }
    return (
        <fieldset disabled={disabled} className="min-w-0 space-y-3">
            <Label htmlFor={id}>
                {t(optional ? "optionalSupervisor" : "supervisor")}
            </Label>
            {optional && (
                <p className="text-sm leading-6 text-muted-foreground">
                    {t("assignLaterHint")}
                </p>
            )}
            <p className="text-sm leading-6 text-muted-foreground">
                {t("searchHint")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                    className="h-11 min-w-0 bg-background/80 text-start"
                    dir="auto"
                    id={id}
                    value={query}
                    maxLength={100}
                    placeholder={t("search")}
                    onChange={(event) => {
                        revision.current++;
                        setSearching(false);
                        setQuery(event.target.value);
                        setSearched(false);
                        setResults([]);
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={query.trim().length < 2 || searching}
                    onClick={search}
                >
                    {searching ? (
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin"
                        />
                    ) : (
                        <Search aria-hidden="true" className="size-4" />
                    )}
                    {t(searching ? "searching" : "searchButton")}
                </Button>
            </div>
            <div aria-live="polite">
                {searched && !results.length && (
                    <p className="text-sm leading-6 text-muted-foreground">
                        {t("noResults")}
                    </p>
                )}
                {results.length > 0 && (
                    <ul className="max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-card divide-y divide-border/50">
                        {results.map((candidate) => (
                            <li key={candidate.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(candidate);
                                        setResults([]);
                                        setSearched(false);
                                    }}
                                    className="w-full px-4 py-3 text-start transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                >
                                    <span className="block break-words font-medium">
                                        {candidate.name}
                                    </span>
                                    <span
                                        dir="ltr"
                                        className="block break-all text-start text-sm leading-6 text-muted-foreground"
                                    >
                                        {candidate.email}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {value && (
                    <p className="break-words rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-6">
                        <Check
                            aria-hidden="true"
                            className="me-2 inline size-4 text-primary"
                        />
                        {t("selected")}: <strong>{value.name}</strong>{" "}
                        <bdi className="break-all text-muted-foreground">
                            ({value.email})
                        </bdi>
                    </p>
                )}
                {optional && value && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onChange(null)}
                    >
                        {t("assignLater")}
                    </Button>
                )}
            </div>
        </fieldset>
    );
}

export function CreateCircleForm() {
    const t = useTranslations("Admin");
    const router = useRouter();
    const id = useId();
    const [supervisor, setSupervisor] = useState<Candidate | null>(null);
    const [pending, setPending] = useState(false);
    const [timezone, setTimezone] = useState("");
    const [schedule, setSchedule] = useState<MeetingScheduleSlot[]>([
        { weekday: 1, localTime: "20:00" },
    ]);
    const form = useRef<HTMLFormElement>(null);
    async function submit(data: FormData) {
        setPending(true);
        try {
            const result = await createGroup({
                name: data.get("name"),
                description: data.get("description"),
                supervisorId: supervisor?.id,
                timezone,
                schedule,
            });
            if (!result.success) {
                toast.error(t("failed"));
                return;
            }
            form.current?.reset();
            setSupervisor(null);
            toast.success(t("success"));
            router.refresh();
        } catch {
            toast.error(t("failed"));
        } finally {
            setPending(false);
        }
    }
    return (
        <form
            ref={form}
            action={submit}
            aria-busy={pending}
            className="min-w-0"
        >
            <fieldset disabled={pending} className="min-w-0 space-y-6">
                <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                    <section className="min-w-0 space-y-5">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">
                            <FileText
                                aria-hidden="true"
                                className="size-4 text-primary"
                            />
                            {t("circleDetails")}
                        </h3>
                        <div className="space-y-2">
                            <Label htmlFor={id}>{t("name")}</Label>
                            <Input
                                id={id}
                                name="name"
                                required
                                minLength={2}
                                maxLength={80}
                                className="h-11 bg-background/80 text-start"
                                dir="auto"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${id}-description`}>
                                {t("descriptionLabel")}
                            </Label>
                            <Textarea
                                id={`${id}-description`}
                                name="description"
                                maxLength={300}
                                className="min-h-28 resize-y bg-background/80 text-start"
                                dir="auto"
                            />
                        </div>
                    </section>
                    <section className="min-w-0 space-y-5 border-t border-border/60 pt-6 lg:border-t-0 lg:border-s lg:pt-0 lg:ps-8">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">
                            <ShieldCheck
                                aria-hidden="true"
                                className="size-4 text-primary"
                            />
                            {t("supervision")}
                        </h3>
                        <SupervisorPicker
                            optional
                            value={supervisor}
                            onChange={setSupervisor}
                            disabled={pending}
                        />
                    </section>
                </div>
                <div className="border-t border-border/60 pt-6">
                    <MeetingScheduleFields
                        schedule={schedule}
                        setSchedule={setSchedule}
                        timezone={timezone}
                        setTimezone={setTimezone}
                        disabled={pending}
                    />
                </div>
                <div className="flex justify-end border-t border-border/60 pt-5">
                    <Button
                        className="min-h-11 w-full px-6 sm:w-auto"
                        disabled={pending || !timezone}
                    >
                        {pending ? (
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-4 animate-spin"
                            />
                        ) : (
                            <Plus aria-hidden="true" className="size-4" />
                        )}
                        {t(pending ? "creating" : "create")}
                    </Button>
                </div>
            </fieldset>
        </form>
    );
}

export function CircleControls({
    groupId,
    name,
    description,
    hasSupervisor,
}: {
    groupId: string;
    name: string;
    description: string | null;
    hasSupervisor: boolean;
}) {
    const t = useTranslations("Admin");
    const router = useRouter();
    const id = useId();
    const [mode, setMode] = useState<"replace" | "delete" | "edit" | null>(
        null,
    );
    const [editedName, setEditedName] = useState(name);
    const [editedDescription, setEditedDescription] = useState(
        description ?? "",
    );
    const [supervisor, setSupervisor] = useState<Candidate | null>(null);
    const [confirmation, setConfirmation] = useState("");
    const [pending, setPending] = useState(false);
    async function submit() {
        setPending(true);
        try {
            const result =
                mode === "edit"
                    ? await updateCircle({
                          groupId,
                          name: editedName,
                          description: editedDescription,
                      })
                    : mode === "replace"
                      ? await replaceSupervisor({
                            groupId,
                            supervisorId: supervisor?.id,
                        })
                      : await deleteCircle({ groupId, confirmation });
            if (!result.success) {
                toast.error(
                    t(
                        result.reason === "active_meeting"
                            ? "activeMeeting"
                            : "failed",
                    ),
                );
                return;
            }
            setMode(null);
            setSupervisor(null);
            setConfirmation("");
            toast.success(t("success"));
            router.refresh();
        } catch {
            toast.error(t("failed"));
        } finally {
            setPending(false);
        }
    }
    function close() {
        setMode(null);
        setConfirmation("");
        setSupervisor(null);
    }
    const title = t(
        mode === "edit"
            ? "edit"
            : mode === "replace"
              ? hasSupervisor
                  ? "replace"
                  : "assignSupervisor"
              : "delete",
    );
    const dialogDescription = t(
        mode === "edit"
            ? "editHint"
            : mode === "replace"
              ? hasSupervisor
                  ? "replaceHint"
                  : "assignLaterHint"
              : "deleteHint",
    );
    return (
        <>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch gap-2">
                <Button
                    variant="outline"
                    className="h-auto min-h-11 whitespace-normal px-3 py-2 text-xs sm:text-sm"
                    onClick={() => {
                        setEditedName(name);
                        setEditedDescription(description ?? "");
                        setMode("edit");
                    }}
                >
                    <Pencil aria-hidden="true" className="size-3.5" />
                    {t("edit")}
                </Button>
                <Button
                    className="h-auto min-h-11 whitespace-normal px-3 py-2 text-xs sm:text-sm"
                    variant={hasSupervisor ? "ghost" : "default"}
                    onClick={() => {
                        setSupervisor(null);
                        setMode("replace");
                    }}
                >
                    <UserRoundPlus aria-hidden="true" className="size-3.5" />
                    {t(hasSupervisor ? "replace" : "assignSupervisor")}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("delete")}
                    title={t("delete")}
                    className="size-11 self-center shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                        setConfirmation("");
                        setMode("delete");
                    }}
                >
                    <Trash2 aria-hidden="true" className="size-4" />
                </Button>
            </div>

            <AdminDialog
                open={mode !== null}
                onClose={close}
                pending={pending}
                title={title}
                description={dialogDescription}
                footer={
                    <>
                        <Button
                            variant="outline"
                            disabled={pending}
                            onClick={close}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            variant={
                                mode === "delete" ? "destructive" : "default"
                            }
                            disabled={
                                pending ||
                                (mode === "edit"
                                    ? editedName.trim().length < 2
                                    : mode === "replace"
                                      ? !supervisor
                                      : confirmation !== name)
                            }
                            onClick={submit}
                        >
                            {pending && (
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="size-4 animate-spin"
                                />
                            )}
                            {t(
                                mode === "edit"
                                    ? "saveDetails"
                                    : mode === "replace"
                                      ? "save"
                                      : "delete",
                            )}
                        </Button>
                    </>
                }
            >
                {mode === "edit" ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor={`${id}-name`}>{t("name")}</Label>
                            <Input
                                id={`${id}-name`}
                                value={editedName}
                                disabled={pending}
                                dir="auto"
                                className="bg-card text-start"
                                minLength={2}
                                maxLength={80}
                                onChange={(event) =>
                                    setEditedName(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${id}-description`}>
                                {t("descriptionLabel")}
                            </Label>
                            <Textarea
                                id={`${id}-description`}
                                value={editedDescription}
                                disabled={pending}
                                dir="auto"
                                className="max-h-60 resize-y bg-card text-start"
                                maxLength={300}
                                onChange={(event) =>
                                    setEditedDescription(event.target.value)
                                }
                            />
                        </div>
                    </div>
                ) : mode === "replace" ? (
                    <SupervisorPicker
                        value={supervisor}
                        onChange={setSupervisor}
                        disabled={pending}
                    />
                ) : (
                    <div className="space-y-2">
                        <Label
                            htmlFor={id}
                            className="block break-words leading-6"
                        >
                            {t("confirmation")}: {name}
                        </Label>
                        <Input
                            id={id}
                            dir="auto"
                            className="bg-card text-start"
                            autoComplete="off"
                            value={confirmation}
                            disabled={pending}
                            onChange={(event) =>
                                setConfirmation(event.target.value)
                            }
                        />
                    </div>
                )}
            </AdminDialog>
        </>
    );
}
