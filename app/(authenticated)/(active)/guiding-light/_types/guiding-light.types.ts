export interface Member {
  id: string
  name: string
  company: string
  profileImage: string | null
}

export interface Winner {
  id: string
  name: string
  company: string
  profileImage: string | null
}

export type Phase = 'idle' | 'spinning' | 'revealed'
