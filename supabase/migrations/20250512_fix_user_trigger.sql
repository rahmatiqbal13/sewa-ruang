-- Update the handle_new_user trigger to handle all user metadata fields
-- This fixes issues when creating users via admin API with additional fields

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    name, 
    email, 
    role,
    phone,
    borrower_category,
    institution,
    class_division,
    identity_number,
    telegram_username
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'borrower'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'borrower_category',
    NEW.raw_user_meta_data->>'institution',
    NEW.raw_user_meta_data->>'class_division',
    NEW.raw_user_meta_data->>'identity_number',
    NEW.raw_user_meta_data->>'telegram_username'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Trigger updated successfully to handle all user metadata fields' as status;
