import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

type Cfg = Record<string, string | number | boolean | undefined>

/** Raw config value as string; missing → '' so BaseNode shows an em dash. */
function pick(cfg: Cfg, key: string): string {
  const v = cfg[key]
  if (v === undefined || v === null) return ''
  return String(v)
}

/**
 * Select value for preview (same spirit as MemoryNode: raw value + default).
 * When kind is `custom` and a custom label is set, show the label instead.
 */
function kindPreview(cfg: Cfg, key: string, defaultValue: string, customLabelKey?: string): string {
  const v = pick(cfg, key) || defaultValue
  if (v === 'custom' && customLabelKey) {
    const custom = pick(cfg, customLabelKey).trim()
    if (custom && custom.toLowerCase() !== 'custom') return custom
    return ''
  }
  return v
}

/** Prefer URL for the third row; if unset, surface description so the card is not blank. */
function linkOrNote(cfg: Cfg): { label: string; value: string } {
  const url = pick(cfg, 'url')
  if (url) return { label: 'link', value: url }
  return { label: 'note', value: pick(cfg, 'description') }
}

export default function GenericIntegrationNode(props: NodeProps<BaseNodeData>) {
  const cfg = props.data.config as Cfg
  const t = props.data.nodeType

  let preview: { label: string; value: string | number | boolean }[] = []

  switch (t) {
    case 'genericDocument': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'type', value: kindPreview(cfg, 'documentKind', 'pdf', 'customKindLabel') },
        { label: 'path', value: pick(cfg, 'pathOrUrl') },
        { label: tail.label === 'link' ? 'alt url' : tail.label, value: tail.value },
      ]
      break
    }
    case 'genericImage': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'type', value: kindPreview(cfg, 'imageKind', 'raster', 'customImageKindLabel') },
        { label: 'path', value: pick(cfg, 'pathOrUrl') },
        { label: tail.label === 'link' ? 'alt url' : tail.label, value: tail.value },
      ]
      break
    }
    case 'genericVideo': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'type', value: kindPreview(cfg, 'videoKind', 'file', 'customVideoKindLabel') },
        { label: 'path', value: pick(cfg, 'pathOrUrl') },
        { label: tail.label === 'link' ? 'alt url' : tail.label, value: tail.value },
      ]
      break
    }
    case 'genericCloud': {
      const region = pick(cfg, 'regionOrZone')
      const tail = linkOrNote(cfg)
      const row3 = region
        ? { label: 'region', value: region }
        : { label: tail.label === 'link' ? 'link' : tail.label, value: tail.value }
      preview = [
        { label: 'cloud', value: kindPreview(cfg, 'cloudKind', 'aws', 'customCloudKindLabel') },
        { label: 'acct', value: pick(cfg, 'accountOrProject') },
        row3,
      ]
      break
    }
    case 'genericScript': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'lang', value: kindPreview(cfg, 'scriptLanguage', 'javascript', 'customScriptLanguageLabel') },
        { label: 'entry', value: pick(cfg, 'entryOrPath') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericMessenger': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'chan', value: kindPreview(cfg, 'messengerKind', 'channel', 'customMessengerLabel') },
        { label: 'thread', value: pick(cfg, 'thread') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericEmail': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'mode', value: kindPreview(cfg, 'emailMode', 'receive', 'customEmailModeLabel') },
        { label: 'addr', value: pick(cfg, 'address') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericDatabase': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'engine', value: kindPreview(cfg, 'dbKind', 'sql', 'customDbLabel') },
        { label: 'conn', value: pick(cfg, 'connection') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericStorage': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'back', value: kindPreview(cfg, 'storageKind', 'objectStore', 'customStorageLabel') },
        { label: 'bucket', value: pick(cfg, 'bucketOrPath') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericWeb':
      preview = [
        { label: 'surf', value: kindPreview(cfg, 'webKind', 'site', 'customWebLabel') },
        { label: 'url', value: pick(cfg, 'url') },
        { label: 'note', value: pick(cfg, 'description') },
      ]
      break
    case 'genericWebPage': {
      const pageUrl = pick(cfg, 'url')
      preview = [
        { label: 'kind', value: kindPreview(cfg, 'pageKind', 'landing', 'customPageKindLabel') },
        { label: 'title', value: pick(cfg, 'pageTitle') },
        {
          label: pageUrl ? 'url' : 'note',
          value: pageUrl || pick(cfg, 'description'),
        },
      ]
      break
    }
    case 'genericCalendar': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'scope', value: kindPreview(cfg, 'calendarScope', 'personal', 'customCalendarLabel') },
        { label: 'cal', value: pick(cfg, 'calendarId') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericAutomation': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'trig', value: kindPreview(cfg, 'automationKind', 'webhook', 'customAutomationLabel') },
        { label: 'flow', value: pick(cfg, 'workflow') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericScheduler': {
      const sched = pick(cfg, 'scheduleOrCron')
      const tail = linkOrNote(cfg)
      const row3 = sched ? { label: 'cron', value: sched } : { label: tail.label, value: tail.value }
      preview = [
        { label: 'style', value: kindPreview(cfg, 'schedulerKind', 'cron', 'customSchedulerKindLabel') },
        { label: 'job', value: pick(cfg, 'jobOrQueue') },
        row3,
      ]
      break
    }
    case 'genericNotifications': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'chan', value: kindPreview(cfg, 'notificationKind', 'push', 'customNotificationKindLabel') },
        { label: 'dest', value: pick(cfg, 'destination') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericCrm': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'obj', value: kindPreview(cfg, 'crmObjectKind', 'lead', 'customCrmObjectLabel') },
        { label: 'name', value: pick(cfg, 'objectType') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericSupport': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'desk', value: kindPreview(cfg, 'supportKind', 'ticketing', 'customSupportLabel') },
        { label: 'queue', value: pick(cfg, 'queue') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericPayments': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'surf', value: kindPreview(cfg, 'paymentsKind', 'payments', 'customPaymentsLabel') },
        { label: 'acct', value: pick(cfg, 'account') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericVoice': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'chan', value: kindPreview(cfg, 'telephonyKind', 'sms', 'customTelephonyLabel') },
        { label: 'num', value: pick(cfg, 'phoneNumber') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericCode': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'host', value: kindPreview(cfg, 'codeHostKind', 'git', 'customCodeHostLabel') },
        { label: 'repo', value: pick(cfg, 'repository') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    case 'genericAnalytics': {
      const tail = linkOrNote(cfg)
      preview = [
        { label: 'work', value: kindPreview(cfg, 'analyticsKind', 'warehouse', 'customAnalyticsLabel') },
        { label: 'proj', value: pick(cfg, 'projectOrDataset') },
        { label: tail.label, value: tail.value },
      ]
      break
    }
    default:
      preview = []
  }

  return <BaseNode {...props} preview={preview} />
}
