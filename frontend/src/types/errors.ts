export type APIError = {
	status?: number
	message: string
	detail?: string
	errors?: Array<{ loc?: (string | number)[]; msg?: string; type?: string }>
}


