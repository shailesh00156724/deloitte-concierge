/**
 * Shared type definitions for the Deloitte Concierge domain layer.
 *
 * This is a plain JS project (no TypeScript, no build step — see README for why),
 * so these are JSDoc typedefs: editor type hints and documentation, not a compiler.
 * Nothing here imports from ui/ or adapters/, and nothing here may.
 */

/**
 * All money values are integer pence to keep policy/budget arithmetic exact.
 * @typedef {Object} Money
 * @property {number} amount - value in pence (e.g. 4500 = £45.00)
 * @property {'GBP'} currency
 */

/** @typedef {'deloitte_project_team'|'deloitte_leadership'|'client_social'} AudienceCategory */

/** @typedef {'dinner_and_drinks'|'drinks_and_nibbles'|'activity_plus_meal'|'large_event'} EventType */

/** @typedef {'green'|'amber'|'red'|'unknown'} PolicyOutcome */

/** @typedef {'engagement_partner'|'practice_leader'} ApproverRole */

/** @typedef {'receipts'|'attendee_list'|'exception_justification'} EvidenceArtefact */

/**
 * The organiser's own Deloitte grade. Several real policy thresholds key off
 * this directly, rather than off the audience being entertained.
 * @typedef {'partner'|'director_or_below'} OrganiserGrade
 */

/**
 * @typedef {Object} SpendThresholdControl
 * @property {'spend_threshold'} kind
 * @property {string} id
 * @property {string} label
 * @property {Money} perAttendee
 * @property {Money} [amberBandTo]
 * @property {Money} [overallEventCap]
 */

/**
 * A spend threshold that varies by the organiser's own grade, plus absolute
 * ceilings that apply regardless of grade (no amber band beyond these —
 * exceeding either is a hard block).
 * @typedef {Object} GradedSpendThresholdControl
 * @property {'graded_spend_threshold'} kind
 * @property {string} id
 * @property {string} label
 * @property {Record<OrganiserGrade, Money>} perAttendeeByGrade
 * @property {Money} absoluteCeilingPerAttendee
 * @property {Money} absoluteCeilingTotalEvent
 */

/**
 * A fixed per-attendee cap that applies to attendees carrying any of `tags`
 * (e.g. restricted entities, Public Officials), regardless of organiser grade
 * and with no amber exception band — over cap is a hard block.
 * @typedef {Object} TaggedSpendCapControl
 * @property {'tagged_spend_cap'} kind
 * @property {string} id
 * @property {string} label
 * @property {string[]} tags
 * @property {Money} capPerAttendee
 */

/**
 * @typedef {Object} AlcoholControl
 * @property {'alcohol'} kind
 * @property {string} id
 * @property {string} label
 * @property {'permitted'|'permitted_with_approval'|'prohibited'} stance
 * @property {Money} [perAttendeeSubLimit]
 */

/**
 * @typedef {Object} AttendeeClassControl
 * @property {'attendee_class'} kind
 * @property {string} id
 * @property {string} label
 * @property {AudienceCategory[]} permittedAudiences
 * @property {string[]} prohibitedAttendeeTags
 */

/**
 * @typedef {Object} EventSizeLimitControl
 * @property {'event_size_limit'} kind
 * @property {string} id
 * @property {string} label
 * @property {number} maxAttendees
 * @property {number} [amberAboveAttendees]
 */

/**
 * @typedef {Object} ApprovalControl
 * @property {'approval'} kind
 * @property {string} id
 * @property {string} label
 * @property {ApproverRole} approverRole
 * @property {'always'|'above_threshold'|'on_exception'} requiredWhen
 */

/**
 * @typedef {Object} EvidenceControl
 * @property {'evidence'} kind
 * @property {string} id
 * @property {string} label
 * @property {EvidenceArtefact[]} artefacts
 * @property {'always'|'above_threshold'} requiredWhen
 */

/**
 * @typedef {Object} ExceptionReasonControl
 * @property {'exception_reason'} kind
 * @property {string} id
 * @property {string} label
 * @property {string[]} acceptedReasons
 */

/**
 * @typedef {SpendThresholdControl|GradedSpendThresholdControl|TaggedSpendCapControl|AlcoholControl|AttendeeClassControl|EventSizeLimitControl|ApprovalControl|EvidenceControl|ExceptionReasonControl} PolicyControl
 */

/**
 * A versioned, structured policy rule. Never hard-code conversational text —
 * every outcome and explanation is derived from this data at evaluation time.
 * @typedef {Object} PolicyRule
 * @property {string} id
 * @property {string} version
 * @property {string} ruleSetVersion
 * @property {AudienceCategory} audience
 * @property {EventType[]|'all'} eventTypes
 * @property {string} effectiveFrom - ISO date, inclusive
 * @property {string|null} effectiveTo - ISO date, exclusive; null = open-ended
 * @property {number} specificity - explicit precedence weight, higher wins
 * @property {PolicyControl[]} controls
 * @property {string} sourceLabel - e.g. 'SAMPLE — not official Deloitte policy',
 *   or a citation to the real policy document section this rule reflects
 */

/**
 * @typedef {Object} BudgetCalculation
 * @property {Money|null} policyAllowancePerAttendee
 * @property {number} attendeeCount
 * @property {Money|null} policyMaximumTotal
 * @property {Money|null} overallEventCap
 * @property {Money|null} userBudgetCap
 * @property {Money|null} effectiveTotalBudget
 * @property {Money|null} effectivePerAttendee
 * @property {'policy_per_attendee'|'policy_event_cap'|'user_cap'|'none'} bindingConstraint
 */

/**
 * @typedef {Object} PolicyFinding
 * @property {string} controlId
 * @property {PolicyControl['kind']} controlKind
 * @property {PolicyOutcome} outcome
 * @property {string} message
 * @property {string} [observed]
 * @property {string} [limit]
 */

/**
 * @typedef {Object} ApprovalRequirement
 * @property {ApproverRole} approverRole
 * @property {string} reason
 */

/**
 * @typedef {Object} PolicyDecision
 * @property {string} id
 * @property {string} eventRequestId
 * @property {string} ruleSetVersion
 * @property {string|null} matchedRuleId
 * @property {string|null} matchedRuleVersion
 * @property {PolicyOutcome} outcome
 * @property {BudgetCalculation} budget
 * @property {PolicyFinding[]} findings
 * @property {string[]} reasons
 * @property {ApprovalRequirement[]} requiredApprovals
 * @property {EvidenceArtefact[]} requiredEvidence
 * @property {boolean} exceptionReasonRequired
 * @property {boolean} canProceed
 * @property {string} evaluatedAt - ISO timestamp
 * @property {string} inputsHash
 * @property {EvaluatedInputs} inputsSnapshot
 */

/**
 * The subset of an EventRequest that evaluatePolicy actually reads.
 * @typedef {Object} EvaluatedInputs
 * @property {AudienceCategory} audience
 * @property {EventType} eventType
 * @property {OrganiserGrade} organiserGrade
 * @property {number} attendeeCount
 * @property {string[]} attendeeTags
 * @property {boolean} alcoholRequested
 * @property {string} eventDate - ISO date
 * @property {Money|null} userBudgetCap
 * @property {string|null} exceptionReason
 */

/**
 * @typedef {'draft'|'evaluated'|'awaiting_approval'|'approved'|'booked'|'blocked'} EventRequestStatus
 */

/**
 * @typedef {Object} EventRequest
 * @property {string} id
 * @property {string} organiserId
 * @property {string} purpose
 * @property {EventType|null} eventType
 * @property {AudienceCategory|null} audience
 * @property {OrganiserGrade|null} organiserGrade
 * @property {number|null} attendeeCount
 * @property {string|null} attendeeGroupLabel
 * @property {string[]} attendeeTags
 * @property {string|null} eventDate
 * @property {string|null} startTime
 * @property {number|null} durationMinutes
 * @property {string|null} location
 * @property {number|null} searchRadiusMiles
 * @property {string|null} dietaryNeeds
 * @property {string|null} cuisineOrActivityPreference
 * @property {boolean|null} alcoholRequested
 * @property {Money|null} userBudgetCap
 * @property {string|null} exceptionReason
 * @property {EventRequestStatus} status
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {'organiser'|'approver'|'finance_reviewer'|'administrator'} role
 * @property {string} email
 * @property {string} officeLocation
 */

/**
 * A mock venue listing — fictional, not a real business, labelled via
 * `sourceLabel`. See venues.seed.js.
 * @typedef {Object} Venue
 * @property {string} id
 * @property {string} name
 * @property {string} area
 * @property {number} distanceMiles
 * @property {EventType[]} suitableFor
 * @property {Money} perHeadFrom
 * @property {number} maxCapacity
 * @property {boolean} servesAlcohol
 * @property {string[]} dietaryOptions
 * @property {number} rating
 * @property {number} reviewCount
 * @property {string} sourceLabel
 */

/**
 * A venue annotated with its affordability against a policy-approved
 * per-attendee budget. Produced by matchVenues — the policy decides the
 * budget, this just flags venues against it.
 * @typedef {Object} VenueOption
 * @property {Venue} venue
 * @property {Money} estimatedTotal
 * @property {boolean} withinBudget
 * @property {Money|null} overBudgetBy
 */

/**
 * A mock booking confirmation. `simulated` is always true — it is not
 * possible to produce a Booking from this codebase that claims to be real.
 * @typedef {Object} Booking
 * @property {string} reference
 * @property {string} venueId
 * @property {string} venueName
 * @property {string} eventDate
 * @property {string|null} startTime
 * @property {number} attendeeCount
 * @property {Money} estimatedPerHead
 * @property {Money} estimatedTotal
 * @property {string} policyDecisionId
 * @property {string} bookedAt
 * @property {true} simulated
 */

export {};
