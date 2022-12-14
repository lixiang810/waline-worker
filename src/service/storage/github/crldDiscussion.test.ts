// crld means create, read, lock, and delete
import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';
import { GRepositoryDiscussion } from '../../../types/github';
import digestMessage from '../../../utils/digestMessage';
import { addDiscussionComment } from './addDiscussionComment';
import { createDiscussion } from './createDiscussion';
import { deleteDiscussion } from './deleteDiscussion';
import { getDiscussion, SpecificResponse } from './getDiscussion';
import { lockDiscussion } from './lockDiscussion';

describe('Discussion CRLD Test (L stands for Lock)', async () => {
  config();
  let id = '';
  const titleStr = crypto.randomUUID();
  const title = `${titleStr}: ${await digestMessage(titleStr)}`;
  const body = crypto.randomUUID();
  const commentBody = crypto.randomUUID();

  it('should create a discussion', async () => {
    const res = await createDiscussion(process.env.GITHUB_TOKEN, {
      input: {
        repositoryId: process.env.GITHUB_REPO_ID,
        categoryId: process.env.GITHUB_CATEGORY_ID,
        title,
        body,
      },
    });
    if (!process.env.CI) console.log(JSON.stringify(res, null, 2));
    id = res?.data?.createDiscussion?.discussion?.id;
    if (!id) return;
    expect(id).toBeTruthy();
  });

  it('should lock a discussion', async () => {
    // Cannot use condition because of it's async
    expect(id).toBeTruthy();
    if (!id) return;
    const res = await lockDiscussion(process.env.GITHUB_TOKEN, {
      input: {
        clientMutationId: crypto.randomUUID(),
        lockReason: 'RESOLVED',
        lockableId: id,
      },
    });
    if (!process.env.CI) console.log(JSON.stringify(res, null, 2));
    const locked = res.data?.lockLockable?.lockedRecord.locked;
    expect(locked).toBeDefined();
    if (!locked) return;
    expect(locked).toBe(false); // In this case, the discussion is locked.
  });

  it('should add a comment', async () => {
    // Cannot use condition because of it's async
    expect(id).toBeTruthy();
    if (!id) return;
    const res = await addDiscussionComment(
      { discussionId: id, body: commentBody },
      process.env.GITHUB_TOKEN,
    );
    if (!process.env.CI) console.log(JSON.stringify(res, null, 2));
    expect(res).toHaveProperty('data');
    if (!res.data) return;
    expect(res.data).toHaveProperty('addDiscussionComment');
    expect(res.data.addDiscussionComment.comment.body).toBe(commentBody);
  });

  it('should get a discussion', async () => {
    // Cannot use condition because of it's async
    expect(id).toBeTruthy();
    if (!id) return;
    const res = await getDiscussion(process.env.GITHUB_TOKEN, {
      repo: process.env.GITHUB_REPO,
      term: titleStr,
      number: 0,
      category: process.env.GITHUB_CATEGORY,
      strict: true,
      last: 100,
    });
    if (!process.env.CI) console.log(JSON.stringify(res, null, 2));
    expect(res).toHaveProperty('data');
    expect(res).not.toHaveProperty('message');
    expect(res).not.toHaveProperty('errors');
    if ('message' in res) return;
    if ('errors' in res) return;
    let discussion: GRepositoryDiscussion | null;
    if ('search' in res.data) {
      const { search } = res.data;
      const { discussionCount, nodes } = search;
      discussion = discussionCount > 0 ? nodes[0] : null;
    } else {
      discussion = (res as SpecificResponse).data.repository.discussion;
    }
    expect(discussion).not.toBeNull();
    expect(discussion?.body).toBe(body);
    if (!process.env.CI) console.log(JSON.stringify(discussion, null, 2));
  });

  it('should delete a discussion', async () => {
    // Cannot use condition because of it's async
    expect(id).toBeTruthy();
    if (!id) return;
    const res = await deleteDiscussion(process.env.GITHUB_TOKEN, {
      input: { clientMutationId: crypto.randomUUID(), id },
    });
    if (!process.env.CI) console.log(JSON.stringify(res, null, 2));
    const id2 = res?.data?.deleteDiscussion?.discussion?.id;
    expect(id2).toBeDefined();
  });
});
