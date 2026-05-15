# Folder structure

```
ArtifyAssignment/
├── README.md
├── .gitignore
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── FOLDER_STRUCTURE.md   ← this file
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── index.ts              # HTTP + Socket.io bootstrap
│       ├── app.ts                # Express app factory
│       ├── config/
│       │   └── env.ts
│       ├── lib/
│       │   └── prisma.ts
│       ├── middleware/
│       │   ├── authMiddleware.ts
│       │   ├── errorHandler.ts
│       │   └── validate.ts
│       ├── routes/
│       │   ├── authRoutes.ts
│       │   ├── noteRoutes.ts
│       │   └── sharedRoutes.ts
│       ├── controllers/
│       │   ├── authController.ts
│       │   └── notesController.ts
│       ├── services/
│       │   └── aiService.ts
│       └── schemas/
│           ├── authSchemas.ts
│           └── noteSchemas.ts
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── middleware.ts             # /dashboard cookie gate
    ├── components.json           # shadcn/ui alignment
    ├── .env.example
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   ├── api/
        │   │   ├── auth/
        │   │   │   ├── login/route.ts
        │   │   │   ├── signup/route.ts
        │   │   │   ├── logout/route.ts
        │   │   │   └── me/route.ts
        │   │   └── backend/
        │   │       └── [...path]/route.ts   # BFF proxy → Express
        │   ├── login/page.tsx
        │   ├── signup/page.tsx
        │   ├── shared/[shareId]/page.tsx
        │   └── dashboard/
        │       ├── layout.tsx
        │       ├── page.tsx
        │       ├── insights/page.tsx
        │       └── note/[id]/page.tsx
        ├── components/
        │   ├── providers.tsx
        │   ├── layout/dashboard-shell.tsx
        │   └── ui/                 # Button, Card, Dialog, … (shadcn-style)
        ├── context/
        │   └── auth-context.tsx
        └── lib/
            ├── api.ts
            ├── types.ts
            ├── utils.ts
            ├── upstream.ts         # BFF cookie name + upstream URL helper
            └── socket.ts
```
