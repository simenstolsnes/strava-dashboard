import { requireAthlete } from "@/lib/auth";
import { getFtp, getProfile, getSyncStatus } from "@/lib/queries";
import { Card, PageTitle } from "@/components/ui";
import { saveFtp } from "./actions";
import { SyncButton } from "./sync-button";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireAthlete();
  const [profile, ftp, sync] = await Promise.all([getProfile(me), getFtp(me), getSyncStatus(me)]);

  return (
    <>
      <PageTitle wide sub={profile.name}>Settings</PageTitle>
      <div className="max-w-3xl space-y-4">

      <Card title="FTP" subtitle={`In use: ${ftp.ftp ?? "–"} W (${ftp.source}). Used for TSS, intensity and W/kg.`}>
        <form action={saveFtp} className="flex gap-2">
          <input
            name="ftp"
            type="number"
            inputMode="numeric"
            defaultValue={profile.ftpOverride ?? ""}
            placeholder={profile.stravaFtp ? `Strava: ${profile.stravaFtp}` : "e.g. 270"}
            className="w-32 rounded-lg border border-line bg-plate px-3 py-2 text-sm text-ink placeholder:text-muted"
          />
          <button className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink">Save</button>
        </form>
        <p className="mt-2 text-xs text-muted">Leave empty to use Strava’s FTP, or the estimate if none is set.</p>
      </Card>

      <Card
        title="Sync"
        subtitle={`${sync.total} activities stored · ${sync.pending} waiting for analysis${
          sync.lastUpdate ? ` · last update ${new Date(sync.lastUpdate).toLocaleString("en-GB", { timeZone: "Europe/Oslo", dateStyle: "medium", timeStyle: "short" })}` : ""
        }`}
      >
        <p className="mb-3 text-sm text-ink-2">
          New activities arrive automatically via Strava’s webhook. Use this if something seems missing.
        </p>
        <SyncButton />
      </Card>

      <Card title="Heart-rate zones" subtitle="From Strava. Change them in Strava → Settings → My Performance.">
        {profile.hrZones ? (
          <ul className="num space-y-1 text-sm">
            {profile.hrZones.map((z, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--z${i + 1})` }} />
                <span className="w-16 text-ink-2">Zone {i + 1}</span>
                <span className="text-ink">{z.max === -1 ? `${z.min}+ bpm` : `${z.min}–${z.max} bpm`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">Not synced yet.</p>
        )}
      </Card>

      <form action="/api/auth/logout" method="post">
        <button className="w-full rounded-lg border border-line py-3 text-sm font-medium text-critical">Log out</button>
      </form>
      </div>
    </>
  );
}
