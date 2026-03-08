
-- Explorer friends table
CREATE TABLE public.explorer_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.explorer_friends ENABLE ROW LEVEL SECURITY;

-- Users can see their own friend requests (sent or received)
CREATE POLICY "Users can view own friend relations"
ON public.explorer_friends FOR SELECT
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.explorer_friends FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id AND requester_id != addressee_id);

-- Users can update requests addressed to them (accept/decline)
CREATE POLICY "Addressees can update friend requests"
ON public.explorer_friends FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id);

-- Users can delete their own friend relations
CREATE POLICY "Users can delete own friend relations"
ON public.explorer_friends FOR DELETE
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Trigger for updated_at
CREATE TRIGGER update_explorer_friends_updated_at
  BEFORE UPDATE ON public.explorer_friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
