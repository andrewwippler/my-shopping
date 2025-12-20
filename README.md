# My Shopping

Simple shopping list app for my family to keep track of what items we are buying in the store. Divide an conquer!

## Development

Need 2 terminals open to run:
1. `docker-compose up`
2. `cd server && npm run dev`
3. `cd frontend && npm run dev`

To generate the prisma client: `cd server && npx prisma generate`
To push schema changes to prod: `npx prisma db push`

## License

Apache 2.0