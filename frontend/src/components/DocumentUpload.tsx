import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery } from '@tanstack/react-query'
import { deleteDocument, listDocuments, uploadPdf } from '../services/api'
import type { DocumentItem } from '../types'
import toast from 'react-hot-toast'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

import React from 'react'

export const DocumentUpload = React.memo(function DocumentUpload() {
	const [progress, setProgress] = useState<number>(0)
	const [error, setError] = useState<string | null>(null)

	const docsQuery = useQuery<{ documents: DocumentItem[] }>({
		queryKey: ['documents'],
		queryFn: async () => listDocuments(),
		refetchInterval: 3000, // poll for processing updates
	})

	const uploadMutation = useMutation({
		mutationFn: (file: File) => uploadPdf(file, setProgress),
		onMutate: () => {
			setError(null)
			setProgress(0)
		},
		onSuccess: () => {
			toast.success('Upload started. Processing will complete shortly.')
			docsQuery.refetch()
		},
		onError: (e: any) => {
			const msg = e?.response?.data?.detail ?? 'Upload failed'
			setError(msg)
			toast.error(msg)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (docId: string) => deleteDocument(docId),
		onSuccess: () => {
			toast.success('Document deleted')
			docsQuery.refetch()
		},
		onError: () => {
			toast.error('Failed to delete document')
		},
	})

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0]
		if (!file) return
		// Validation
		const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
		if (!isPdf) {
			setError('Only PDF files are allowed')
			return
		}
		if (file.size > MAX_FILE_BYTES) {
			setError('File too large. Maximum size is 10MB.')
			return
		}
		uploadMutation.mutate(file)
	}, [uploadMutation])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: { 'application/pdf': ['.pdf'] },
		maxSize: MAX_FILE_BYTES,
	})

	const documents = docsQuery.data?.documents ?? []

	return (
		<div className="w-full">
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
					isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
				}`}
			>
				<input {...getInputProps()} />
				<p className="text-sm text-gray-600">Drag & drop a PDF here, or click to select (max 10MB)</p>
			</div>

			{uploadMutation.isPending && (
				<div className="mt-4">
					<div className="w-full bg-gray-200 rounded h-2">
						<div className="bg-blue-600 h-2 rounded" style={{ width: `${progress}%` }} />
					</div>
					<p className="text-xs text-gray-600 mt-1">Uploading: {progress}%</p>
				</div>
			)}

			{error && <p className="text-sm text-red-600 mt-2">{error}</p>}

			<div className="mt-6">
				<div className="flex items-center justify-between mb-2">
					<h3 className="font-semibold">Uploaded Documents</h3>
					<button
						className="text-xs text-gray-600 underline"
						onClick={() => docsQuery.refetch()}
						disabled={docsQuery.isRefetching}
					>
						Refresh
					</button>
				</div>
				{docsQuery.isLoading ? (
					<p className="text-sm text-gray-500">Loading documents…</p>
				) : documents.length === 0 ? (
					<p className="text-sm text-gray-500">No documents uploaded yet.</p>
				) : (
					<ul className="divide-y divide-gray-200 border rounded-lg">
						{documents.map((doc) => (
							<li key={doc.doc_id} className="p-3 flex items-center justify-between">
								<div>
									<div className="text-sm font-medium text-gray-900">{doc.filename}</div>
									<div className="text-xs text-gray-600">
										Status: {doc.status}
										{typeof doc.chunks === 'number' ? ` • Chunks: ${doc.chunks}` : ''}
									</div>
								</div>
								<div className="flex items-center gap-2">
									{(doc.status === 'processing' || doc.status === 'uploaded') && (
										<span className="text-xs text-blue-600">Processing…</span>
									)}
									<button
										className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
										onClick={() => deleteMutation.mutate(doc.doc_id)}
										disabled={deleteMutation.isPending}
									>
										Delete
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
})


