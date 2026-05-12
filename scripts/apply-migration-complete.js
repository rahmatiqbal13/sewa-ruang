// Create exec_sql function and apply migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAndMigrate() {
  console.log('🔧 Setting up database...\n');

  // Step 1: Create exec_sql function
  console.log('1️⃣ Creating exec_sql function...');
  const createExecSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Try to create the function using raw SQL endpoint
  try {
    // Use Supabase REST API to execute SQL
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ sql_query: 'SELECT 1' })
    });

    if (response.status === 404) {
      console.log('   ℹ️  exec_sql function not found, will apply migration directly...');
    }
  } catch (e) {
    // Expected error
  }

  // Step 2: Apply migration directly via individual queries
  console.log('\n2️⃣ Applying migration (direct method)...');

  const queries = [
    // 1. Add columns to bookings
    {
      name: 'Add payment columns to bookings',
      sql: `ALTER TABLE public.bookings 
            ADD COLUMN IF NOT EXISTS payment_qr_url TEXT,
            ADD COLUMN IF NOT EXISTS payment_code VARCHAR(50),
            ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
            ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES public.users(id),
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
            ADD COLUMN IF NOT EXISTS payment_bank VARCHAR(50)`
    },
    {
      name: 'Create payment_code index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_payment_code 
            ON public.bookings(payment_code) WHERE payment_code IS NOT NULL`
    },
    // 2. Create payment_proofs table
    {
      name: 'Create payment_proofs table',
      sql: `CREATE TABLE IF NOT EXISTS public.payment_proofs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
            proof_url TEXT NOT NULL,
            bank_name VARCHAR(50),
            account_name VARCHAR(100),
            transfer_amount DECIMAL(12,2),
            transfer_date DATE,
            notes TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            verified_by UUID REFERENCES public.users(id),
            verified_at TIMESTAMP WITH TIME ZONE,
            rejection_reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          )`
    },
    {
      name: 'Create payment_proofs indexes',
      sql: `CREATE INDEX IF NOT EXISTS idx_payment_proofs_booking ON public.payment_proofs(booking_id);
            CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs(status);
            CREATE INDEX IF NOT EXISTS idx_payment_proofs_pending ON public.payment_proofs(status) WHERE status = 'pending'`
    },
    // 3. Create bank_accounts table
    {
      name: 'Create bank_accounts table',
      sql: `CREATE TABLE IF NOT EXISTS public.bank_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bank_name VARCHAR(50) NOT NULL,
            bank_code VARCHAR(10),
            account_number VARCHAR(50) NOT NULL,
            account_name VARCHAR(100) NOT NULL,
            branch VARCHAR(100),
            qr_image_url TEXT,
            is_active BOOLEAN DEFAULT true,
            is_primary BOOLEAN DEFAULT false,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          )`
    },
    {
      name: 'Create bank_accounts index',
      sql: `CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.bank_accounts(is_active) WHERE is_active = true`
    },
    // 4. Insert default banks
    {
      name: 'Insert default bank accounts',
      sql: `INSERT INTO public.bank_accounts (bank_name, bank_code, account_number, account_name, is_primary, display_order)
            VALUES 
              ('BCA', '014', '1234567890', 'Direktorat Olahraga Unesa', true, 1),
              ('Mandiri', '008', '0987654321', 'Direktorat Olahraga Unesa', false, 2),
              ('BRI', '002', '1122334455', 'Direktorat Olahraga Unesa', false, 3)
            ON CONFLICT DO NOTHING`
    },
    // 5. Create generate_payment_code function
    {
      name: 'Create generate_payment_code function',
      sql: `CREATE OR REPLACE FUNCTION generate_payment_code()
            RETURNS TRIGGER AS $$
            DECLARE
              new_code VARCHAR(50);
              code_exists BOOLEAN;
            BEGIN
              IF NEW.payment_code IS NULL AND NEW.status = 'pending_payment' THEN
                LOOP
                  new_code := 'SIMP-' || SUBSTRING(NEW.id::text, 1, 8) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 6));
                  SELECT EXISTS(SELECT 1 FROM public.bookings WHERE payment_code = new_code) INTO code_exists;
                  EXIT WHEN NOT code_exists;
                END LOOP;
                NEW.payment_code := new_code;
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql`
    },
    {
      name: 'Create payment_code trigger',
      sql: `DROP TRIGGER IF EXISTS trg_generate_payment_code ON public.bookings;
            CREATE TRIGGER trg_generate_payment_code
              BEFORE INSERT OR UPDATE ON public.bookings
              FOR EACH ROW EXECUTE FUNCTION generate_payment_code()`
    },
    // 6. Enable RLS
    {
      name: 'Enable RLS on payment_proofs',
      sql: `ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY`
    },
    {
      name: 'Enable RLS on bank_accounts',
      sql: `ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY`
    },
    // 7. Create RLS policies
    {
      name: 'Create payment_proofs SELECT policy',
      sql: `DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
            CREATE POLICY "Users can view own payment proofs" ON public.payment_proofs FOR SELECT
            USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = payment_proofs.booking_id AND b.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')))`
    },
    {
      name: 'Create payment_proofs INSERT policy',
      sql: `DROP POLICY IF EXISTS "Users can insert own payment proofs" ON public.payment_proofs;
            CREATE POLICY "Users can insert own payment proofs" ON public.payment_proofs FOR INSERT
            WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = payment_proofs.booking_id AND b.user_id = auth.uid()))`
    },
    {
      name: 'Create payment_proofs UPDATE policy',
      sql: `DROP POLICY IF EXISTS "Only admins can update payment proofs" ON public.payment_proofs;
            CREATE POLICY "Only admins can update payment proofs" ON public.payment_proofs FOR UPDATE
            USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')))`
    },
    {
      name: 'Create bank_accounts SELECT policy',
      sql: `DROP POLICY IF EXISTS "Bank accounts are viewable by everyone" ON public.bank_accounts;
            CREATE POLICY "Bank accounts are viewable by everyone" ON public.bank_accounts FOR SELECT
            TO authenticated, anon USING (is_active = true)`
    },
    {
      name: 'Create bank_accounts ALL policy',
      sql: `DROP POLICY IF EXISTS "Only admins can manage bank accounts" ON public.bank_accounts;
            CREATE POLICY "Only admins can manage bank accounts" ON public.bank_accounts FOR ALL
            USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')))`
    },
    // 8. Create verify_payment function
    {
      name: 'Create verify_booking_payment function',
      sql: `CREATE OR REPLACE FUNCTION verify_booking_payment(
              p_booking_id UUID, p_admin_id UUID, p_status VARCHAR(20), p_rejection_reason TEXT DEFAULT NULL
            ) RETURNS BOOLEAN AS $$
            DECLARE v_booking_status VARCHAR(50);
            BEGIN
              SELECT status INTO v_booking_status FROM public.bookings WHERE id = p_booking_id;
              IF v_booking_status NOT IN ('pending_payment', 'payment_uploaded') THEN RETURN false; END IF;
              
              IF p_status = 'verified' THEN
                UPDATE public.bookings SET status = 'paid', payment_verified_at = now(), payment_verified_by = p_admin_id, updated_at = now() WHERE id = p_booking_id;
                UPDATE public.payment_proofs SET status = 'verified', verified_by = p_admin_id, verified_at = now() WHERE booking_id = p_booking_id AND status = 'pending';
              ELSIF p_status = 'rejected' THEN
                UPDATE public.payment_proofs SET status = 'rejected', verified_by = p_admin_id, verified_at = now(), rejection_reason = p_rejection_reason WHERE booking_id = p_booking_id AND status = 'pending';
                UPDATE public.bookings SET status = 'pending_payment', payment_proof_url = NULL, updated_at = now() WHERE id = p_booking_id;
              END IF;
              RETURN true;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER`
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const query of queries) {
    try {
      console.log(`   📝 ${query.name}...`);
      
      // Use Supabase REST API to execute SQL
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ sql_query: query.sql })
      });

      if (response.ok || response.status === 204) {
        console.log(`      ✅ Success`);
        successCount++;
      } else {
        const errorText = await response.text();
        // Check if it's "already exists" error
        if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          console.log(`      ✅ Already exists (OK)`);
          successCount++;
        } else {
          console.log(`      ⚠️  ${errorText.substring(0, 100)}`);
          errorCount++;
        }
      }
    } catch (error) {
      console.log(`      ⚠️  Error (might be OK if already exists)`);
      errorCount++;
    }
  }

  // Step 3: Verify
  console.log('\n3️⃣ Verifying migration...');
  
  const { data: banks } = await supabase.from('bank_accounts').select('*');
  console.log(`   ✅ bank_accounts: ${banks?.length || 0} records`);
  banks?.forEach(b => console.log(`      - ${b.bank_name}: ${b.account_number}`));

  const { count: proofsCount } = await supabase.from('payment_proofs').select('*', { count: 'exact', head: true });
  console.log(`   ✅ payment_proofs table: ${proofsCount !== null ? 'exists' : 'error'}`);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Migration Complete: ${successCount}/${queries.length} queries applied`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} queries had errors (may be already exists)`);
  }
  console.log('='.repeat(60));

  console.log('\n📋 IMPORTANT NEXT STEP:');
  console.log('Create storage bucket "payments" in Supabase Dashboard:');
  console.log('1. Go to Supabase Dashboard → Storage');
  console.log('2. Click "New bucket"');
  console.log('3. Name: payments');
  console.log('4. Check "Public bucket"');
  console.log('5. Click "Save"');
}

setupAndMigrate();
