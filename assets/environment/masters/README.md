# Environment master models

The source models the CORE environment's assets are optimised from (Meshy GLBs). They're far too large for Git
(55–325 MB each), so `.gitignore` keeps them out; only this note is tracked. Store them alongside the project's other
source art and copy them here to rebuild the optimised levels with `npm run env:optimize`.

Never edit a master in place. The optimiser only reads them, checks each one's SHA-256 before and after, and records it
in the asset's manifest (`public/models/environment/**/<id>.json`), so a level can always be traced to its master.

| Master | Size | SHA-256 |
| --- | --- | --- |
| `granite/granite-headland.glb` | 55,552,828 B | `9df6a163459ad74e35f59043c3d20fe09f67aa2576a4dddeaf0240186d7622aa` |
| `trees/eastern-white-pine.glb` | 325,419,096 B | `5088eec9ac3bc34eae62180be9332bb5a2e199528ad4168011fb3177fc758c9f` |
| `trees/coastal-oak.glb` | 247,343,308 B | `504eeb54fe7672c0a57c177619e7ae2bb4d9881d68adba3e4b35b98578ad99aa` |
| `shrubs/beach-rose.glb` | 241,613,392 B | `6d09b54dbc8a00ff09430ad0043611eb8b7a655dc4d7916d18dda82786ea8249` |
