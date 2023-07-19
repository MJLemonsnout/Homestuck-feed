import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

const matchText: string[] = [
  // very common, match these first
  '#homestuck',
  '#hom3stuck',
  '#hiveswap',
  '#fantroll',
  '#trollsona',
  '#mspa',
  '#sburb',
  '#sahcon',
  '#vasterror'

  // broader terms, yet still common
  'homestuck',
  'hiveswap',
  'mspa',
  'ms paint adventures',
  'sburb',
  'tabletop roleplaying game',
  'tabletop roleplaying games',
  'tabletop rpgs',

  // publishers
  'andrew hussie',
  'hussie',
  'mspfa',

  // ships - will add more
  'davekat',
  '#davekat',
  'rosemary',
  '#rosemary',
  'vrisrezi',
  '#vrisrezi',
  'les8ifins',
  '#les8ifins',
  'meowrails',
  '#meowrails',
  'gamrezi',
  '#gamrezi',
  'johnvris',
  '#johnvris',
  'daverezi',
  '#daverezi',
  'arasol',
  '#arasol',
  'pormara',
  '#pormara',
  'dirkjake',
  '#dirkjake',
  'johnkat',
  '#johnkat',
  
  // characters - just egbert for now
  'john egbert',
  'june egbert',
  'egbert',
  '#johnegbert',
  '#juneegbert',
  'ghostytrickster',
  'ectobiologist',

  'lemonsnout',

  // terms
  'alchemiter',
  'alternia',
  'auspistice',
  'auspisticism',
  'boondollars', 
  'broadwaystuck',
  'carapacian',
  'chumhandle',
  'classpect',
  'cruxite',
  'ectobiology',
  'fantroll',
  'gristtorrent',
  'hemospectrum',
  'hemotyping',
  'incipisphere',
  'kismesis',
  'kismesissitude',
  'legislacerator',
  'matesprit',
  'matespritship',
  'moirail',
  'moirallegiance',
  'paradoxspace',
  'paradox space',
  'pesterchum',
  'sburb',
  'scalemate',
  'skaia',
  'skaianet', 
  'subjugglator',
  'subjugglation',
  'sylladex',
  'trollsona',

const matchPatterns: RegExp[] = [
  /(^|[\s\W])h[o|0]m[e|3]stuck($|[\W\s])/im,
]

// Include high profile Homestuck fans here to always include their posts
const matchUsers: string[] = [
  //
]

// Exclude posts from these users
const bannedUsers: string[] = [
  //
]


export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        const txt = create.record.text.toLowerCase()
        return (
          (matchText.some((term) => txt.includes(term)) ||
            matchPatterns.some((pattern) => pattern.test(txt)) ||
            matchUsers.includes(create.author)) &&
          !bannedUsers.includes(create.author)
        )
      })
      .map((create) => {
        console.log(`Found post by ${create.author}: ${create.record.text}`)
        
        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
