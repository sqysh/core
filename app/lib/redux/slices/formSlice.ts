import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// 1. Better type definitions
export type Inputs = Record<string, string | number | boolean | any>
export type Errors = Record<string, string>

// 2. Create a type-safe form registry
export const FORM_REGISTRY = {
  applicationForm: {
    inputs: {
      name: '',
      email: '',
      phone: '',
      location: '',
      company: '',
      industry: '',
      businessLicenseNumber: ''
    },
    errors: {
      name: '',
      email: '',
      phone: '',
      location: '',
      company: '',
      industry: '',
      businessLicenseNumber: ''
    }
  },
  face2faceForm: {
    inputs: {
      recipientId: '',
      scheduledAt: '',
      notes: ''
    },
    errors: {
      recipientId: '',
      scheduledAt: '',
      notes: ''
    }
  },
  anchorForm: {
    inputs: {
      giverId: '',
      businessValue: '',
      description: '',
      closedDate: ''
    },
    errors: {
      giverId: '',
      businessValue: '',
      description: '',
      closedDate: ''
    }
  },
  treasureMapForm: {
    inputs: {
      receiverId: '',
      clientName: '',
      clientPhone: '',
      serviceNeeded: '',
      notes: ''
    },
    errors: {
      receiverId: '',
      clientName: '',
      clientPhone: '',
      serviceNeeded: '',
      notes: ''
    }
  }
} as const

export type FormName = keyof typeof FORM_REGISTRY

// 3. Enhanced payload types
interface SetErrorsPayload {
  formName: FormName
  errors: Errors
}

interface HandleInputPayload {
  formName: FormName
  name: string
  value: string | number | boolean
}

interface HandleTogglePayload {
  formName: FormName
  name: string
  checked: boolean
}

interface FormData {
  inputs: Inputs
  errors: Errors
  isDirty: boolean // Track if form has been modified
  touchedFields: string[]
}

interface InitialFormState {
  progress: number
  isLoading: boolean
  forms: Record<FormName, FormData>
}

const formInitialState: InitialFormState = {
  progress: 0,
  isLoading: false,
  forms: Object.fromEntries(
    Object.entries(FORM_REGISTRY).map(([formName, initialState]) => [
      formName,
      {
        inputs: initialState.inputs,
        errors: {},
        isDirty: false,
        touchedFields: []
      }
    ])
  ) as unknown as Record<FormName, FormData>
}

const formSlice = createSlice({
  name: 'form',
  initialState: formInitialState,
  reducers: {
    setIsLoading: (state, { payload }: PayloadAction<boolean>) => {
      state.isLoading = payload
    },

    // 5. Reset to initial state from registry
    resetForm: (state, { payload }: PayloadAction<FormName>) => {
      const initialState = FORM_REGISTRY[payload]
      if (state.forms[payload]) {
        state.forms[payload] = {
          inputs: initialState,
          errors: {},
          isDirty: false,
          touchedFields: []
        }
      }
    },

    setInputs: (state, { payload }: PayloadAction<{ formName: FormName; data: Inputs }>) => {
      const { formName, data } = payload

      if (state.forms[formName]) {
        state.forms[formName].inputs = {
          ...state.forms[formName].inputs,
          ...data
        }
        state.forms[formName].isDirty = true
      }
    },

    setErrors: (state, { payload }: PayloadAction<SetErrorsPayload>) => {
      const { formName, errors } = payload
      if (state.forms[formName]) {
        state.forms[formName].errors = errors
      }
    },

    // 6. Clear specific error
    clearError: (state, { payload }: PayloadAction<{ formName: FormName; fieldName: string }>) => {
      const { formName, fieldName } = payload
      if (state.forms[formName]?.errors[fieldName]) {
        delete state.forms[formName].errors[fieldName]
      }
    },

    clearInputs: (state, { payload }: PayloadAction<{ formName: FormName }>) => {
      const { formName } = payload
      if (state.forms[formName]) {
        state.forms[formName].inputs = FORM_REGISTRY[formName]
        state.forms[formName].isDirty = false
        state.forms[formName].touchedFields = []
      }
    },

    clearErrors: (state, { payload }: PayloadAction<{ formName: FormName }>) => {
      const { formName } = payload
      if (state.forms[formName]) {
        state.forms[formName].errors = {}
      }
    },

    handleInput: (state, action: PayloadAction<HandleInputPayload>) => {
      const { formName, name, value } = action.payload
      const form = state.forms[formName]

      if (form) {
        form.inputs[name] = value
        form.isDirty = true

        // Add to array if not already present
        if (!form.touchedFields.includes(name)) {
          form.touchedFields.push(name)
        }

        if (form.errors[name]) {
          delete form.errors[name]
        }
      }
    },

    handleToggle: (state, { payload }: PayloadAction<HandleTogglePayload>) => {
      const { formName, name, checked } = payload
      const form = state.forms[formName]

      if (form) {
        form.inputs[name] = checked
        form.isDirty = true

        if (!form.touchedFields.includes(name)) {
          form.touchedFields.push(name)
        }

        if (form.errors[name]) {
          delete form.errors[name]
        }
      }
    },
    setUploadProgress: (state, { payload }: PayloadAction<number>) => {
      state.progress = payload
    },

    touchField: (state, { payload }: PayloadAction<{ formName: FormName; fieldName: string }>) => {
      const { formName, fieldName } = payload
      if (state.forms[formName] && !state.forms[formName].touchedFields.includes(fieldName)) {
        state.forms[formName].touchedFields.push(fieldName)
      }
    },

    setFieldValue: (state, { payload }: PayloadAction<{ formName: FormName; fieldName: string; value: any }>) => {
      const { formName, fieldName, value } = payload
      const form = state.forms[formName]

      if (form) {
        form.inputs[fieldName] = value
        form.isDirty = true

        if (!form.touchedFields.includes(fieldName)) {
          form.touchedFields.push(fieldName)
        }
      }
    }
  }
})

// 9. Type-safe dispatch
type AppDispatch = (action: { type: string; payload?: unknown }) => void

// 10. Enhanced form actions with better typing
export const createFormActions = (formName: FormName, dispatch: AppDispatch) => ({
  setInputs: (data: Inputs) => dispatch(formSlice.actions.setInputs({ formName, data })),

  clearInputs: () => dispatch(formSlice.actions.clearInputs({ formName })),

  setErrors: (errors: Errors) => dispatch(formSlice.actions.setErrors({ formName, errors })),

  clearError: (fieldName: string) => dispatch(formSlice.actions.clearError({ formName, fieldName })),

  clearErrors: () => dispatch(formSlice.actions.clearErrors({ formName })),

  handleInput: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    dispatch(
      formSlice.actions.handleInput({
        formName,
        name: e.target.name,
        value: e.target.value
      })
    ),

  handleToggle: (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatch(
      formSlice.actions.handleToggle({
        formName,
        name: e.target.name,
        checked: e.target.checked
      })
    ),

  touchField: (fieldName: string) => dispatch(formSlice.actions.touchField({ formName, fieldName })),

  setFieldValue: (fieldName: string, value: string | number | boolean) =>
    dispatch(formSlice.actions.setFieldValue({ formName, fieldName, value })),

  handleUploadProgress: (progress: number) => dispatch(formSlice.actions.setUploadProgress(progress)),

  resetForm: () => dispatch(formSlice.actions.resetForm(formName))
})

// 11. Export selectors for better state access
export const selectForm = (state: { form: InitialFormState }, formName: FormName) => state.form.forms[formName]

export const selectFormInputs = (state: { form: InitialFormState }, formName: FormName) =>
  state.form.forms[formName]?.inputs

export const selectFormErrors = (state: { form: InitialFormState }, formName: FormName) =>
  state.form.forms[formName]?.errors

export const selectFormIsDirty = (state: { form: InitialFormState }, formName: FormName) =>
  state.form.forms[formName]?.isDirty

export const selectFormTouchedFields = (state: { form: InitialFormState }, formName: FormName) =>
  state.form.forms[formName]?.touchedFields

export const selectIsLoading = (state: { form: InitialFormState }) => state.form.isLoading

export const selectUploadProgress = (state: { form: InitialFormState }) => state.form.progress

export const { resetForm, setInputs, clearInputs, clearErrors, clearError, setIsLoading, touchField, setFieldValue } =
  formSlice.actions

export const formReducer = formSlice.reducer
