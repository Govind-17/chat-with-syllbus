import axios from 'axios'
import type { APIError } from '../types/errors'
import toast from 'react-hot-toast'

export const http = axios.create({
	baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000/api',
	timeout: 20000,
})

// Simple retry for network failures (once)
http.interceptors.response.use(
	(resp) => resp,
	async (error) => {
		const config = error.config || {}
		if (!config.__retry && (!error.response || error.code === 'ECONNABORTED')) {
			config.__retry = true
			return http(config)
		}

		// Normalize error
		const apiError: APIError = {
			status: error.response?.status,
			message: error.response?.data?.detail || error.message || 'Request failed',
			detail: error.response?.data?.detail,
			errors: error.response?.data?.errors,
		}

		// User-friendly toast (skip for some endpoints if desired)
		if (apiError.status && apiError.status >= 500) {
			toast.error('Server error. Please try again later.')
		} else if (apiError.status === 422) {
			toast.error('Invalid input. Please check your request.')
		} else if (!apiError.status) {
			toast.error('Network error. Retrying failed.')
		}

		return Promise.reject(apiError)
	}
)


