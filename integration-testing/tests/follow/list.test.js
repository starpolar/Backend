/* eslint-env jest */

const cognito = require('../../utils/cognito.js')
const schema = require('../../utils/schema.js')

const loginCache = new cognito.AppSyncLoginCache()

beforeAll(async () => {
  loginCache.addCleanLogin(await cognito.getAppSyncLogin())
  loginCache.addCleanLogin(await cognito.getAppSyncLogin())
  loginCache.addCleanLogin(await cognito.getAppSyncLogin())
  loginCache.addCleanLogin(await cognito.getAppSyncLogin())
})

beforeEach(async () => await loginCache.clean())
afterAll(async () => await loginCache.clean())


test('getFollowe[d|r]Users cant request NOT_FOLLOWING', async () => {
  const [ourClient, ourUserId] = await loginCache.getCleanLogin()
  let variables = {userId: ourUserId, followStatus: 'NOT_FOLLOWING'}
  let resp = await ourClient.query({query: schema.followedUsers, variables})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()
})


test('getFollowe[d|r]Users queries respond correctly for each followStatus', async () => {
  // two new private users
  const [ourClient, ourUserId] = await loginCache.getCleanLogin()
  let resp = await ourClient.mutate({mutation: schema.setUserPrivacyStatus, variables: {privacyStatus: 'PRIVATE'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['setUserDetails']['privacyStatus']).toBe('PRIVATE')

  const [theirClient, theirUserId] = await loginCache.getCleanLogin()
  resp = await theirClient.mutate({mutation: schema.setUserPrivacyStatus, variables: {privacyStatus: 'PRIVATE'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['setUserDetails']['privacyStatus']).toBe('PRIVATE')

  // there should be no followe[d|r] users
  resp = await ourClient.query({query: schema.ourFollowedUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  // we follow them
  resp = await ourClient.mutate({mutation: schema.followUser, variables: {userId: theirUserId}})
  expect(resp['errors']).toBeUndefined()

  // should now be REQUESTED state
  resp = await ourClient.query({query: schema.ourFollowedUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followedUsers']['items'][0]['userId']).toBe(theirUserId)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followerUsers']['items'][0]['userId']).toBe(ourUserId)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  // they accept the follow request
  resp = await theirClient.mutate({mutation: schema.acceptFollowerUser, variables: {userId: ourUserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['acceptFollowerUser']['followerStatus']).toBe('FOLLOWING')

  // should now be FOLLOWING state
  resp = await ourClient.query({query: schema.ourFollowedUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followedUsers']['items'][0]['userId']).toBe(theirUserId)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followedUsers']['items'][0]['userId']).toBe(theirUserId)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followerUsers']['items'][0]['userId']).toBe(ourUserId)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followerUsers']['items'][0]['userId']).toBe(ourUserId)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  // they change their mind and now deny the follow request
  resp = await theirClient.mutate({mutation: schema.denyFollowerUser, variables: {userId: ourUserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['denyFollowerUser']['followerStatus']).toBe('DENIED')

  // should now be DENIED state
  resp = await ourClient.query({query: schema.ourFollowedUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.ourFollowedUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followedUsers']['items'][0]['userId']).toBe(theirUserId)

  resp = await theirClient.query({query: schema.ourFollowerUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'FOLLOWING'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'REQUESTED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(0)

  resp = await theirClient.query({query: schema.ourFollowerUsers, variables: {followStatus: 'DENIED'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(1)
  expect(resp['data']['self']['followerUsers']['items'][0]['userId']).toBe(ourUserId)
})


test('Get Followe[d|r] Users order', async () => {
  // us and three others
  const [ourClient, ourUserId] = await loginCache.getCleanLogin()
  const [other1Client, other1UserId] = await loginCache.getCleanLogin()
  const [other2Client, other2UserId] = await loginCache.getCleanLogin()
  const [other3Client, other3UserId] = await loginCache.getCleanLogin()

  // we follow all of them
  let resp = await ourClient.mutate({mutation: schema.followUser, variables: {userId: other1UserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['followUser']['followedStatus']).toBe('FOLLOWING')
  resp = await ourClient.mutate({mutation: schema.followUser, variables: {userId: other2UserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['followUser']['followedStatus']).toBe('FOLLOWING')
  resp = await ourClient.mutate({mutation: schema.followUser, variables: {userId: other3UserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['followUser']['followedStatus']).toBe('FOLLOWING')

  // they all follow us
  resp = await other1Client.mutate({mutation: schema.followUser, variables: {userId: ourUserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['followUser']['followedStatus']).toBe('FOLLOWING')
  resp = await other2Client.mutate({mutation: schema.followUser, variables: {userId: ourUserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['followUser']['followedStatus']).toBe('FOLLOWING')
  resp = await other3Client.mutate({mutation: schema.followUser, variables: {userId: ourUserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['followUser']['followedStatus']).toBe('FOLLOWING')

  // verify our followed users is in the right order (most recent first)
  resp = await ourClient.query({query: schema.ourFollowedUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followedUsers']['items']).toHaveLength(3)
  expect(resp['data']['self']['followedUsers']['items'][0]['userId']).toBe(other3UserId)
  expect(resp['data']['self']['followedUsers']['items'][1]['userId']).toBe(other2UserId)
  expect(resp['data']['self']['followedUsers']['items'][2]['userId']).toBe(other1UserId)

  // verify our follower users is in the right order (most recent first)
  resp = await ourClient.query({query: schema.ourFollowerUsers})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['self']['followerUsers']['items']).toHaveLength(3)
  expect(resp['data']['self']['followerUsers']['items'][0]['userId']).toBe(other3UserId)
  expect(resp['data']['self']['followerUsers']['items'][1]['userId']).toBe(other2UserId)
  expect(resp['data']['self']['followerUsers']['items'][2]['userId']).toBe(other1UserId)
})


test('getFollowe[d|r]Users queries only allow followStatus FOLLOWING when querying about other users', async () => {
  const [ourClient] = await loginCache.getCleanLogin()
  const [, userId] = await loginCache.getCleanLogin()

  // we can see their FOLLOWING relationships
  let resp = await ourClient.query({query: schema.followedUsers, variables: {userId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['user']['followedUsers']['items']).toHaveLength(0)
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['user']['followedUsers']['items']).toHaveLength(0)

  resp = await ourClient.query({query: schema.followerUsers, variables: {userId: userId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['user']['followerUsers']['items']).toHaveLength(0)
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['user']['followerUsers']['items']).toHaveLength(0)

  // we can *not* see their REQUESTED relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'REQUESTED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'REQUESTED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()

  // we can *not* see their DENIED relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'DENIED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'DENIED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()
})


test('getFollowe[d|r]Users queries correctly hide responses when querying about other private users', async () => {
  // another private user, don't follow them yet
  const [ourClient, ourUserId] = await loginCache.getCleanLogin()
  const [theirClient, userId] = await loginCache.getCleanLogin()
  let resp = await theirClient.mutate({mutation: schema.setUserPrivacyStatus, variables: {privacyStatus: 'PRIVATE'}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['setUserDetails']['privacyStatus']).toBe('PRIVATE')

  // we can *not* see their FOLLOWING relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()

  // request to follow them
  resp = await ourClient.mutate({mutation: schema.followUser, variables: {userId: userId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['followUser']['followedStatus']).toBe('REQUESTED')

  // still can't see FOLLOWING relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()

  // they deny the follow request
  resp = await theirClient.mutate({mutation: schema.denyFollowerUser, variables: {userId: ourUserId}})
  expect(resp['data']['denyFollowerUser']['followerStatus']).toBe('DENIED')

  // still can't see FOLLOWING relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()

  // they accept the follow request
  resp = await theirClient.mutate({mutation: schema.acceptFollowerUser, variables: {userId: ourUserId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['acceptFollowerUser']['followerStatus']).toBe('FOLLOWING')

  // now we *can* see FOLLOWING relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['user']['followedUsers']['items']).toHaveLength(0)
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'FOLLOWING', userId}})
  expect(resp['errors']).toBeUndefined()
  expect(resp['data']['user']['followerUsers']['items']).toHaveLength(1)

  // we still *cannot* see their REQUESTED relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'REQUESTED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'REQUESTED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()

  // we still *cannot* see their DENIED relationships
  resp = await ourClient.query({query: schema.followedUsers, variables: {followStatus: 'DENIED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followedUsers']).toBeNull()
  resp = await ourClient.query({query: schema.followerUsers, variables: {followStatus: 'DENIED', userId}})
  expect(resp['errors'].length).toBeTruthy()
  expect(resp['data']['user']['followerUsers']).toBeNull()
})
