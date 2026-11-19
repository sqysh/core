// Members tap these on the check-in screen; they float up the TV.
export const REACTION_EMOJIS = ['👏', '🔥', '❤️', '🙌', '🤝', '🚀'] as const

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export const REACTIONS_CHANNEL = 'stage-reactions'
export const REACTIONS_EVENT = 'reaction'

/** Minimum gap between one member's reactions, so a held-down thumb can't flood the TV */
export const REACTION_COOLDOWN_MS = 400
