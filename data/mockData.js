const SOCIAL_DEFAULTS = [
  {
    id: 'ig', name: 'Instagram', handle: '@fixylogistica', cls: 'ig',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="white"/></svg>',
    text: 'Última publicación próximamente.', link: 'https://instagram.com/fixylogistica', date: '—'
  },
  {
    id: 'li', name: 'LinkedIn', handle: 'Fixy Logística', cls: 'li',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    text: 'Última publicación próximamente.', link: 'https://linkedin.com/company/fixylogistica', date: '—'
  },
  {
    id: 'tk', name: 'TikTok', handle: '@fixylogistica', cls: 'tk',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.84 4.84 0 01-1.01-.07z"/></svg>',
    text: 'Último video próximamente.', link: 'https://tiktok.com/@fixylogistica', date: '—'
  },
  {
    id: 'yt', name: 'YouTube', handle: 'Fixy Logística', cls: 'yt',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="red"/></svg>',
    text: 'Último video próximamente.', link: 'https://youtube.com/@fixylogistica', date: '—'
  }
];

const REACTION_TYPES = [
  { key: 'like',  emoji: '👍', label: 'Me gusta' },
  { key: 'love',  emoji: '❤️', label: 'Me encanta' },
  { key: 'care',  emoji: '🥰', label: 'Me importa' },
  { key: 'haha',  emoji: '😂', label: 'Me divierte' },
  { key: 'wow',   emoji: '😮', label: 'Me asombra' },
  { key: 'sad',   emoji: '😢', label: 'Me entristece' },
  { key: 'angry', emoji: '😡', label: 'Me enoja' }
];
