export const commentUserSelect = {
  id: true,
  nickname: true,
  roles: true,
  avatar: {
    select: {
      id: true,
      url: true,
    },
  },
  squad: {
    select: {
      id: true,
      tag: true,
      side: {
        select: {
          type: true,
        },
      },
    },
  },
} as const;

export const commentReplyUserSelect = {
  id: true,
  nickname: true,
  roles: true,
} as const;
