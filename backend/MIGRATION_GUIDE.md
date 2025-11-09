# Database Migration Guide

## Prerequisites
- PostgreSQL database running
- Node.js and npm installed
- Environment variables configured (`.env` file with `DATABASE_URL`)

## Step-by-Step Migration

### 1. Backup Your Database
**IMPORTANT**: Always backup your database before running migrations!

```bash
# Using pg_dump (adjust connection details)
pg_dump -h localhost -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Run Database Migration
This will create the new tables and update existing ones:

```bash
npx prisma migrate dev --name add_approval_workflow_and_tracking
```

**Note**: If you have existing data, you may need to handle:
- Existing users: Update role field to use enum values
- Existing items: Add barcode and categoryId

### 5. Handle Existing Data (if applicable)

#### Update User Roles
If you have existing users with string roles, update them:

```sql
-- Update existing users to use enum values
UPDATE "User" SET role = 'USER' WHERE role = 'user' OR role IS NULL;
UPDATE "User" SET role = 'ADMIN' WHERE role = 'admin';
```

#### Create Default Category
Before updating items, create at least one category:

```sql
INSERT INTO "Category" (name, description, "createdAt", "updatedAt")
VALUES ('General', 'General items category', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

#### Update Existing Items
You'll need to:
1. Add a categoryId to all items
2. Add a barcode to all items

```sql
-- Get the first category ID (adjust if needed)
DO $$
DECLARE
    first_category_id INTEGER;
BEGIN
    SELECT id INTO first_category_id FROM "Category" LIMIT 1;
    
    -- Update items with default category
    UPDATE "Item" 
    SET "categoryId" = first_category_id 
    WHERE "categoryId" IS NULL;
    
    -- Generate barcodes for items without them
    UPDATE "Item"
    SET barcode = 'BC' || LPAD(id::text, 10, '0')
    WHERE barcode IS NULL OR barcode = '';
END $$;
```

### 6. Seed the Database (Optional)
This will create sample admin/user accounts and categories:

```bash
npm run seed
```

**Default Credentials**:
- Admin: `admin@example.com` / `AdminPass123!`
- User: `user@example.com` / `UserPass123!`

### 7. Verify Migration
Check that all tables and fields exist:

```bash
npx prisma studio
```

Or query the database:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check categories
SELECT * FROM "Category";

-- Check items have barcodes and categories
SELECT id, name, barcode, "categoryId", status FROM "Item" LIMIT 5;
```

## Troubleshooting

### Migration Fails Due to Existing Data

If migration fails because of existing data constraints:

1. **Items without categories**:
   ```sql
   -- First, ensure you have at least one category
   INSERT INTO "Category" (name, "createdAt", "updatedAt")
   VALUES ('Uncategorized', NOW(), NOW());
   
   -- Then update items
   UPDATE "Item" SET "categoryId" = (SELECT id FROM "Category" LIMIT 1)
   WHERE "categoryId" IS NULL;
   ```

2. **Items without barcodes**:
   ```sql
   -- Generate unique barcodes
   UPDATE "Item"
   SET barcode = 'BC' || LPAD(id::text, 10, '0') || LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 6, '0')
   WHERE barcode IS NULL;
   ```

3. **Duplicate barcodes**:
   ```sql
   -- Find duplicates
   SELECT barcode, COUNT(*) 
   FROM "Item" 
   GROUP BY barcode 
   HAVING COUNT(*) > 1;
   
   -- Update duplicates with unique values
   UPDATE "Item" i1
   SET barcode = i1.barcode || '-' || i1.id
   WHERE EXISTS (
       SELECT 1 FROM "Item" i2 
       WHERE i2.barcode = i1.barcode 
       AND i2.id < i1.id
   );
   ```

### Rollback Migration

If you need to rollback:

```bash
# List migrations
npx prisma migrate status

# Reset database (WARNING: This deletes all data!)
npx prisma migrate reset

# Or manually rollback in database
# Drop new columns/tables created by migration
```

## Post-Migration Checklist

- [ ] All users have valid role enum values (USER or ADMIN)
- [ ] All items have a barcode
- [ ] All items have a categoryId
- [ ] At least one category exists
- [ ] Test admin login
- [ ] Test user login
- [ ] Test creating a category (admin)
- [ ] Test creating an item (admin)
- [ ] Test requesting a movement (user)
- [ ] Test approving a movement (admin)

## Environment Variables

Ensure your `.env` file has:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_db"
JWT_SECRET="your-secret-key-here"
PORT=4000
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
```

## Next Steps

1. Update your frontend to use the new API endpoints
2. Test all workflows:
   - User registration/login
   - Admin operations
   - Movement requests and approvals
   - Item returns
   - Tracking features
3. Review the API documentation in `POSTMAN_EXAMPLES.md`
4. Import the Postman collection for testing

## Support

If you encounter issues:
1. Check Prisma migration logs
2. Verify database connection
3. Ensure all environment variables are set
4. Check that PostgreSQL version is compatible (12+)

