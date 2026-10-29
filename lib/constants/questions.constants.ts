import { QuestionAnswer } from '@prisma/client'

export interface BallotQuestion {
  key: string
  title: string
  summary: string
  detail: string[]
  options: { value: QuestionAnswer; label: string; hint?: string }[]
}

export const BALLOT_QUESTIONS: BallotQuestion[] = [
  {
    key: 'zoom',
    title: 'Should we allow members to join by Zoom?',
    summary: 'So a member who travels, has a conflict, or can\u2019t make 7am every single week can still take part.',
    detail: [
      'Right now, missing a Thursday means missing everything. Over a year that costs us good members who are otherwise a great fit.',
      'The setup would be a speakerphone in the middle of the table, around $150 to $300, so remote members can hear the room and the room can hear them. Audio only to start. Laptop mics can\u2019t pick up 15 people and the room can\u2019t hear a laptop speaker, which is why most hybrid meetings fail.',
      'Video would mean a conference camera, roughly $1,000, and the TV is already running attendance, Guiding Light, the presentation and matchups. So video is a later conversation, not this one.',
      'There is money in the account for the speakerphone. This vote is about whether we want the format, not about the purchase.'
    ],
    options: [
      { value: 'YES', label: 'Yes', hint: 'Let\u2019s try it' },
      { value: 'NO', label: 'No', hint: 'Keep it in person' },
      { value: 'INTERESTED', label: 'Interested', hint: 'Want to hear more first' }
    ]
  },
  {
    key: 'august-off',
    title: 'Should we take all of August off?',
    summary: 'No meetings for the month, back the first Thursday of September.',
    detail: [
      'Attendance is always thin in August between vacations and summer schedules.',
      'Taking the month off means nobody feels guilty about missing, and we come back in September with everyone there.',
      'The alternative is keeping the meetings and accepting a half-full room for four weeks.'
    ],
    options: [
      { value: 'YES', label: 'Yes', hint: 'Take August off' },
      { value: 'NO', label: 'No', hint: 'Keep meeting' },
      { value: 'INTERESTED', label: 'No preference', hint: 'Fine either way' }
    ]
  }
]
