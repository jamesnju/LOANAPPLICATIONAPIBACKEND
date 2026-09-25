loan-platform/
│
├── apps/
│   │
│   ├── backend/
│   │   │
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── env.ts
│   │   │   │   └── cloudinary.ts
│   │   │   │
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── kyc.controller.ts
│   │   │   │   ├── document.controller.ts
│   │   │   │   ├── loan.controller.ts
│   │   │   │   └── notification.controller.ts
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── role.middleware.ts
│   │   │   │   ├── error.middleware.ts
│   │   │   │   └── upload.middleware.ts
│   │   │   │
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── kyc.routes.ts
│   │   │   │   ├── document.routes.ts
│   │   │   │   ├── loan.routes.ts
│   │   │   │   └── notification.routes.ts
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── kyc.service.ts
│   │   │   │   ├── document.service.ts
│   │   │   │   ├── loan.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── cloudinary.service.ts
│   │   │   │
│   │   │   ├── schemas/
│   │   │   │   ├── auth.schema.ts
│   │   │   │   ├── user.schema.ts
│   │   │   │   ├── kyc.schema.ts
│   │   │   │   ├── loan.schema.ts
│   │   │   │   └── document.schema.ts
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── password.ts
│   │   │   │   ├── jwt.ts
│   │   │   │   └── api-response.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   └── express.d.ts
│   │   │   │
│   │   │   │
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   │
│   │   ├── tests/
│   │   │
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │
│   └── frontend/
│       │
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   └── register/
│       │   │   │
│       │   │   ├── (customer)/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── kyc/
│       │   │   │   ├── loans/
│       │   │   │   ├── notifications/
│       │   │   │   └── profile/
│       │   │   │
│       │   │   ├── admin/
│       │   │   ├── maker/
│       │   │   ├── checker/
│       │   │   │
│       │   │   ├── api/
│       │   │   │   └── auth/
│       │   │   │
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   │
│       │   ├── components/
│       │   │   ├── auth/
│       │   │   ├── kyc/
│       │   │   ├── loans/
│       │   │   ├── dashboard/
│       │   │   ├── notifications/
│       │   │   └── ui/
│       │   │
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   ├── auth.ts
│       │   │   └── utils.ts
│       │   │
│       │   ├── hooks/
│       │   ├── types/
│       │   └── middleware.ts
│       │
│       ├── public/
│       ├── .env.local
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/
│
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
└── README.md