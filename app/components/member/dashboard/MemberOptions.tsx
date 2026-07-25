import { Member } from '@/types/dashboard.types'

export function MemberOptions({
  members,
  showOutOfChapterMember
}: {
  members: Member[]
  showOutOfChapterMember?: boolean
}) {
  return (
    <>
      <option value="" disabled>
        Select a member…
      </option>
      {showOutOfChapterMember && <option value="external">Out of chaper member</option>}
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
          {m.industry ? ` · ${m.industry}` : ''}
        </option>
      ))}
    </>
  )
}
