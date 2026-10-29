export const TARGET_REGISTRATIONS = 500
export const CAMPAIGN_DAYS = 7
export const CAMPAIGN_BUDGET = 2000

export const CHANNELS = [
  'College Ambassadors',
  'WhatsApp Communities',
  'College Clubs / LinkedIn / Email',
]

export function normalizeCode(code) {
  return typeof code === 'string' ? code.trim().toLowerCase() : ''
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

export function getLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (!isValidDate(date)) {
    return null
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getAnalytics(registrations, ambassadors) {
  const safeRegistrations = Array.isArray(registrations) ? registrations : []
  const safeAmbassadors = Array.isArray(ambassadors) ? ambassadors : []
  const channelCounts = CHANNELS.reduce((counts, channel) => {
    counts[channel] = safeRegistrations.filter((item) => item?.source === channel).length
    return counts
  }, {})

  const ambassadorCodes = new Set(
    safeAmbassadors.map((ambassador) => normalizeCode(ambassador?.code)).filter(Boolean),
  )
  const referredRegistrations = safeRegistrations.filter((registration) =>
    ambassadorCodes.has(normalizeCode(registration?.ambassadorCode)),
  )
  const referralCounts = safeAmbassadors
    .map((ambassador) => ({
      ...ambassador,
      registrations: safeRegistrations.filter(
      (registration) =>
        normalizeCode(registration?.ambassadorCode) === normalizeCode(ambassador?.code) &&
        normalizeCode(ambassador?.code) !== '',
      ).length,
    }))
    .sort((a, b) => b.registrations - a.registrations)

  const bestChannel = safeRegistrations.length
    ? Object.entries(channelCounts).sort(([, a], [, b]) => b - a)[0]
    : null

  return {
    total: safeRegistrations.length,
    channelCounts,
    bestChannel: bestChannel ? { name: bestChannel[0], count: bestChannel[1] } : null,
    referredRegistrations: referredRegistrations.length,
    referralCounts,
  }
}

export function getGrowthRecommendations(analytics) {
  const recommendations = []
  const { total, bestChannel, referredRegistrations, referralCounts } = analytics
  const referralRate = total ? Math.round((referredRegistrations / total) * 100) : 0
  const hasInsufficientData = total < 5
  const registrationLabel = (count, singular = 'registration') =>
    `${count} ${singular}${count === 1 ? '' : 's'}`

  if (!total) {
    return [
      {
        title: 'Collect the first registration',
        detail:
          'No registrations are recorded yet, so there is not enough data to compare channels or referrals. Share the workshop with one relevant audience and record the first response.',
        tone: 'blue',
      },
    ]
  }

  if (bestChannel) {
    recommendations.push({
      title: hasInsufficientData
        ? `Preliminary signal: ${bestChannel.name}`
        : `Prioritise ${bestChannel.name}`,
      detail: hasInsufficientData
        ? `It has ${registrationLabel(bestChannel.count)} out of ${registrationLabel(total)} so far, but more registrations are needed before this channel can be considered a reliable leader.`
        : `It has generated ${registrationLabel(bestChannel.count)} out of ${registrationLabel(total)}. Allocate the next outreach effort there, using a relevant message and permission-based audience.`,
      tone: 'blue',
    })
  }

  if (referralRate < 30) {
    recommendations.push({
      title: hasInsufficientData
        ? 'Preliminary ambassador referral signal'
        : 'Brief ambassadors on trackable referrals',
      detail: hasInsufficientData
        ? `${registrationLabel(referredRegistrations)} out of ${registrationLabel(total)} is linked to a verified ambassador code. More registrations are needed before judging referral performance.`
        : `${registrationLabel(referredRegistrations)} out of ${registrationLabel(total)} uses a verified ambassador code (${referralRate}%). Give active ambassadors a clear code and ask them to share only with relevant students who have opted in to receive workshop information.`,
      tone: 'amber',
    })
  } else if (referralCounts[0]?.registrations) {
    recommendations.push({
      title: hasInsufficientData
        ? `Preliminary referral lead: ${referralCounts[0].name}`
        : `Replicate ${referralCounts[0].name}'s approach`,
      detail: hasInsufficientData
        ? `${referralCounts[0].name} has ${registrationLabel(referralCounts[0].registrations, 'verified registration')}, but more registrations are needed before drawing a reliable ambassador ranking.`
        : `${referralCounts[0].name} leads with ${registrationLabel(referralCounts[0].registrations, 'verified registration')}. Ask them which relevant campus audience and message produced those responses, then test that approach with permission-based outreach.`,
      tone: 'green',
    })
  }

  if (total < TARGET_REGISTRATIONS * 0.5) {
    recommendations.push({
      title: hasInsufficientData ? 'Gather more evidence before optimising' : 'Expand relevant outreach carefully',
      detail: hasInsufficientData
        ? `The campaign has ${registrationLabel(total)} against a ${TARGET_REGISTRATIONS} target. Collect more responses across the available channels before drawing strong conclusions.`
        : `The campaign has ${registrationLabel(total)} against a ${TARGET_REGISTRATIONS} target. Contact relevant audiences with permission, keep messages useful, and avoid repeated reminders or spam.`,
      tone: 'purple',
    })
  }

  return recommendations
}

export function formatDate(dateString) {
  const date = new Date(dateString)
  if (!isValidDate(date)) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function getLastSevenDays(registrations) {
  const safeRegistrations = Array.isArray(registrations) ? registrations : []
  const today = new Date()
  return Array.from({ length: CAMPAIGN_DAYS }, (_, index) => {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - (CAMPAIGN_DAYS - 1 - index))
    const key = getLocalDateKey(date)
    return {
      key,
      label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
      count: safeRegistrations.filter((item) => getLocalDateKey(item?.createdAt) === key).length,
    }
  })
}
