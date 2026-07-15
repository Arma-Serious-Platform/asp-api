export const commentUserSelect = {
  id: true,
  nickname: true,
  role: true,
  isMissionReviewer: true,
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
  role: true,
} as const;
