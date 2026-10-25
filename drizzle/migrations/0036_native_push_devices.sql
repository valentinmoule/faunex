CREATE TABLE public.native_push_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 token text NOT NULL UNIQUE,
 platform text NOT NULL CHECK (platform IN ('ios', 'android')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.native_push_devices TO service_role;
ALTER TABLE public.native_push_devices ENABLE ROW LEVEL SECURITY;
CREATE INDEX native_push_devices_user_idx ON public.native_push_devices(user_id);
COMMENT ON TABLE public.native_push_devices IS 'Private FCM registrations. Accessible only through authenticated device registration and trusted notification senders.';