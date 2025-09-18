-- Triggers for affiliate-factory platform
-- Automated timestamp updates and taxonomy path management

-- ============================================================================
-- TIMESTAMP TRIGGER FUNCTIONS
-- ============================================================================

-- Generic updated_at timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TAXONOMY TRIGGER FUNCTIONS
-- ============================================================================

-- Function to automatically set taxonomy path based on parent hierarchy
CREATE OR REPLACE FUNCTION public.taxonomy_set_path() 
RETURNS TRIGGER AS $$
BEGIN
    -- If no parent, this is a root node
    IF NEW.parent_id IS NULL THEN
        NEW.path := text2ltree(NEW.slug);
    ELSE
        -- Get parent path and append current slug
        SELECT path || text2ltree(NEW.slug) 
        INTO NEW.path 
        FROM public.taxonomy 
        WHERE id = NEW.parent_id;
        
        -- Check if parent exists and has a path
        IF NEW.path IS NULL THEN
            RAISE EXCEPTION 'Parent taxonomy node not found or has no path';
        END IF;
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update paths of child taxonomy nodes when parent path changes
CREATE OR REPLACE FUNCTION public.taxonomy_update_children_paths()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update children if the path actually changed
    IF OLD.path IS DISTINCT FROM NEW.path THEN
        -- Update all children recursively
        UPDATE public.taxonomy 
        SET path = NEW.path || subpath(path, nlevel(OLD.path))
        WHERE path <@ OLD.path AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent taxonomy cycles
CREATE OR REPLACE FUNCTION public.taxonomy_prevent_cycles()
RETURNS TRIGGER AS $$
BEGIN
    -- If parent_id is being set
    IF NEW.parent_id IS NOT NULL THEN
        -- Check if the new parent would create a cycle
        -- This happens if the new parent is a descendant of this node
        IF EXISTS (
            SELECT 1 FROM public.taxonomy 
            WHERE id = NEW.parent_id 
            AND (path <@ (SELECT path FROM public.taxonomy WHERE id = NEW.id))
        ) THEN
            RAISE EXCEPTION 'Cannot set parent: would create circular reference in taxonomy hierarchy';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONTENT VALIDATION TRIGGER FUNCTIONS
-- ============================================================================

-- Function to validate post publication
CREATE OR REPLACE FUNCTION public.validate_post_publication()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is being set to published, ensure published_at is set
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at = now();
    END IF;
    
    -- If status is not published, clear published_at
    IF NEW.status != 'published' THEN
        NEW.published_at = NULL;
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate agent task transitions
CREATE OR REPLACE FUNCTION public.validate_agent_task_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Set started_at when task moves to running
    IF NEW.status = 'running' AND OLD.status != 'running' THEN
        NEW.started_at = now();
    END IF;
    
    -- Set completed_at when task is completed or errors
    IF NEW.status IN ('done', 'error') AND OLD.status NOT IN ('done', 'error') THEN
        NEW.completed_at = now();
    END IF;
    
    -- Clear completed_at if task is reset to queued or running
    IF NEW.status IN ('queued', 'running') THEN
        NEW.completed_at = NULL;
    END IF;
    
    -- Clear started_at if task is reset to queued
    IF NEW.status = 'queued' THEN
        NEW.started_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate subscriber email changes
CREATE OR REPLACE FUNCTION public.validate_subscriber_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate new unsubscribe token if email changes
    IF OLD.email IS DISTINCT FROM NEW.email THEN
        NEW.unsub_token = encode(gen_random_bytes(16), 'hex');
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EMBEDDING MANAGEMENT TRIGGER FUNCTIONS
-- ============================================================================

-- Function to clean up orphaned embeddings
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_embeddings()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up embeddings when referenced content is deleted
    DELETE FROM public.embeddings 
    WHERE ref_table = TG_TABLE_NAME 
    AND ref_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate embeddings when content changes
CREATE OR REPLACE FUNCTION public.invalidate_embeddings_on_content_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete embeddings when content changes significantly
    -- This allows the embedding system to regenerate them
    IF TG_TABLE_NAME = 'posts' THEN
        IF OLD.body_mdx IS DISTINCT FROM NEW.body_mdx OR OLD.title IS DISTINCT FROM NEW.title THEN
            DELETE FROM public.embeddings 
            WHERE ref_table = 'posts' AND ref_id = NEW.id;
        END IF;
    ELSIF TG_TABLE_NAME = 'products' THEN
        IF OLD.title IS DISTINCT FROM NEW.title OR OLD.raw IS DISTINCT FROM NEW.raw THEN
            DELETE FROM public.embeddings 
            WHERE ref_table = 'products' AND ref_id = NEW.id;
        END IF;
    ELSIF TG_TABLE_NAME = 'kb' THEN
        IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
            DELETE FROM public.embeddings 
            WHERE ref_table = 'kb' AND ref_id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Apply updated_at triggers to all tables that have the column
CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_taxonomy_updated_at
    BEFORE UPDATE ON public.taxonomy
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_quiz_updated_at
    BEFORE UPDATE ON public.quiz
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_subscribers_updated_at
    BEFORE UPDATE ON public.subscribers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_subscriber_changes();

CREATE TRIGGER trigger_kb_updated_at
    BEFORE UPDATE ON public.kb
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_calendar_updated_at
    BEFORE UPDATE ON public.calendar
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_embeddings_updated_at
    BEFORE UPDATE ON public.embeddings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TAXONOMY TRIGGERS
-- ============================================================================

-- Set taxonomy path on insert and update
CREATE TRIGGER trigger_taxonomy_set_path
    BEFORE INSERT OR UPDATE ON public.taxonomy
    FOR EACH ROW
    EXECUTE FUNCTION public.taxonomy_set_path();

-- Update children paths when parent path changes
CREATE TRIGGER trigger_taxonomy_update_children
    AFTER UPDATE ON public.taxonomy
    FOR EACH ROW
    WHEN (OLD.path IS DISTINCT FROM NEW.path)
    EXECUTE FUNCTION public.taxonomy_update_children_paths();

-- Prevent circular references
CREATE TRIGGER trigger_taxonomy_prevent_cycles
    BEFORE UPDATE ON public.taxonomy
    FOR EACH ROW
    WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id)
    EXECUTE FUNCTION public.taxonomy_prevent_cycles();

-- ============================================================================
-- CONTENT VALIDATION TRIGGERS
-- ============================================================================

-- Validate post publication status
CREATE TRIGGER trigger_posts_validate_publication
    BEFORE INSERT OR UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_post_publication();

-- Validate agent task status transitions
CREATE TRIGGER trigger_agent_tasks_validate_status
    BEFORE UPDATE ON public.agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_agent_task_status();

-- ============================================================================
-- EMBEDDING CLEANUP TRIGGERS
-- ============================================================================

-- Clean up embeddings when content is deleted
CREATE TRIGGER trigger_posts_cleanup_embeddings
    AFTER DELETE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_orphaned_embeddings();

CREATE TRIGGER trigger_products_cleanup_embeddings
    AFTER DELETE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_orphaned_embeddings();

CREATE TRIGGER trigger_kb_cleanup_embeddings
    AFTER DELETE ON public.kb
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_orphaned_embeddings();

-- Invalidate embeddings when content changes
CREATE TRIGGER trigger_posts_invalidate_embeddings
    AFTER UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.invalidate_embeddings_on_content_change();

CREATE TRIGGER trigger_products_invalidate_embeddings
    AFTER UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.invalidate_embeddings_on_content_change();

CREATE TRIGGER trigger_kb_invalidate_embeddings
    AFTER UPDATE ON public.kb
    FOR EACH ROW
    EXECUTE FUNCTION public.invalidate_embeddings_on_content_change();

-- ============================================================================
-- AUDIT TRIGGERS (Optional - for tracking changes)
-- ============================================================================

-- Function to log significant changes (can be enabled if audit trail is needed)
CREATE OR REPLACE FUNCTION public.log_significant_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be expanded to log changes to an audit table
    -- For now, it's a placeholder that can be customized per tenant needs
    
    -- Example: Log post status changes
    IF TG_TABLE_NAME = 'posts' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Could insert into an audit_log table here
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Uncomment these if audit logging is needed:
-- CREATE TRIGGER trigger_posts_audit
--     AFTER UPDATE ON public.posts
--     FOR EACH ROW
--     EXECUTE FUNCTION public.log_significant_changes();

-- CREATE TRIGGER trigger_products_audit
--     AFTER UPDATE ON public.products
--     FOR EACH ROW
--     EXECUTE FUNCTION public.log_significant_changes();