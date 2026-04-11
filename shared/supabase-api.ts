// Enum for Supabase API operations
export enum SupabaseTable {
  USERS = 'users',
  CV_TEMPLATES = 'cv_templates',
  GENERATED_CVS = 'generated_cvs',
  CONVERSATIONS = 'conversations',
  MESSAGES = 'messages'
}

export enum SupabaseOperation {
  // Basic CRUD operations
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  UPSERT = 'upsert',
  
  // Special operations
  COUNT = 'count',
  EXISTS = 'exists',
  
  // Auth operations
  SIGN_UP = 'sign_up',
  SIGN_IN = 'sign_in',
  SIGN_OUT = 'sign_out',
  GET_USER = 'get_user',
  UPDATE_USER = 'update_user',
  
  // Storage operations
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  DELETE_FILE = 'delete_file',
  LIST_FILES = 'list_files'
}

// API operation configurations
export interface SupabaseApiConfig {
  table: SupabaseTable;
  operation: SupabaseOperation;
  select?: string; // Columns to select
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  data?: any; // For insert/update operations
}

// Specific API configurations for our CV Builder
export const SupabaseApiConfigs = {
  // User operations
  getUserById: {
    table: SupabaseTable.USERS,
    operation: SupabaseOperation.SELECT,
    select: 'id, email, first_name, last_name, profile_image_url, created_at, updated_at',
    filters: { id: 'user_id' }
  },
  
  upsertUser: {
    table: SupabaseTable.USERS,
    operation: SupabaseOperation.UPSERT,
    data: {
      id: 'user_id',
      email: 'email',
      first_name: 'first_name',
      last_name: 'last_name',
      profile_image_url: 'profile_image_url'
    }
  },
  
  // CV Template operations
  getTemplates: {
    table: SupabaseTable.CV_TEMPLATES,
    operation: SupabaseOperation.SELECT,
    select: '*',
    orderBy: { column: 'id', ascending: true }
  },
  
  getTemplateById: {
    table: SupabaseTable.CV_TEMPLATES,
    operation: SupabaseOperation.SELECT,
    select: '*',
    filters: { id: 'template_id' }
  },
  
  createTemplate: {
    table: SupabaseTable.CV_TEMPLATES,
    operation: SupabaseOperation.INSERT,
    data: {
      name: 'name',
      file_name: 'file_name',
      screenshot_url: 'screenshot_url',
      description: 'description'
    }
  },
  
  deleteTemplate: {
    table: SupabaseTable.CV_TEMPLATES,
    operation: SupabaseOperation.DELETE,
    filters: { id: 'template_id' }
  },
  
  // Generated CV operations
  getUserGeneratedCvs: {
    table: SupabaseTable.GENERATED_CVS,
    operation: SupabaseOperation.SELECT,
    select: `
      *,
      cv_templates (
        id,
        name,
        file_name,
        screenshot_url,
        description
      )
    `,
    filters: { user_id: 'user_id' },
    orderBy: { column: 'updated_at', ascending: false }
  },
  
  getGeneratedCvById: {
    table: SupabaseTable.GENERATED_CVS,
    operation: SupabaseOperation.SELECT,
    select: `
      *,
      cv_templates (
        id,
        name,
        file_name,
        screenshot_url,
        description
      )
    `,
    filters: { id: 'cv_id' }
  },
  
  createGeneratedCv: {
    table: SupabaseTable.GENERATED_CVS,
    operation: SupabaseOperation.INSERT,
    data: {
      user_id: 'user_id',
      template_id: 'template_id',
      status: 'status',
      name: 'name',
      original_doc_text: 'original_doc_text',
      original_doc_links: 'original_doc_links'
    }
  },
  
  updateGeneratedCvStatus: {
    table: SupabaseTable.GENERATED_CVS,
    operation: SupabaseOperation.UPDATE,
    filters: { id: 'cv_id' },
    data: {
      status: 'status',
      progress: 'progress',
      pdf_url: 'pdf_url',
      html_content: 'html_content',
      error_message: 'error_message'
    }
  },
  
  deleteGeneratedCv: {
    table: SupabaseTable.GENERATED_CVS,
    operation: SupabaseOperation.DELETE,
    filters: { id: 'cv_id' }
  },
  
  // Conversation operations
  getUserConversations: {
    table: SupabaseTable.CONVERSATIONS,
    operation: SupabaseOperation.SELECT,
    select: '*',
    orderBy: { column: 'created_at', ascending: false }
  },
  
  createConversation: {
    table: SupabaseTable.CONVERSATIONS,
    operation: SupabaseOperation.INSERT,
    data: {
      title: 'title'
    }
  },
  
  // Message operations
  getConversationMessages: {
    table: SupabaseTable.MESSAGES,
    operation: SupabaseOperation.SELECT,
    select: '*',
    filters: { conversation_id: 'conversation_id' },
    orderBy: { column: 'created_at', ascending: true }
  },
  
  createMessage: {
    table: SupabaseTable.MESSAGES,
    operation: SupabaseOperation.INSERT,
    data: {
      conversation_id: 'conversation_id',
      role: 'role',
      content: 'content'
    }
  }
} as const;

// Type helpers
export type SupabaseApiConfigType = typeof SupabaseApiConfigs;
export type SupabaseApiConfigKey = keyof SupabaseApiConfigType;
