import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { uploadPdf } from '../services/api'

export function UploadZone() {
	const [progress, setProgress] = useState<number>(0)

	const mutation = useMutation({
		mutationFn: (file: File) => uploadPdf(file, setProgress),
	})

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const pdf = acceptedFiles.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
		if (!pdf) {
			alert('Please drop a PDF file.')
			return
		}
		setProgress(0)
		mutation.mutate(pdf)
	}, [mutation])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: { 'application/pdf': ['.pdf'] },
	})

	return (
		<div className="my-4">
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded p-6 text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
			>
				<input {...getInputProps()} />
				<p className="text-sm text-gray-600">Drag and drop a PDF here, or click to select</p>
			</div>
			{mutation.isPending && (
				<div className="mt-3">
					<div className="w-full bg-gray-200 rounded h-2">
						<div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
					</div>
					<p className="text-xs text-gray-600 mt-1">Uploading: {progress}%</p>
				</div>
			)}
			{mutation.isSuccess && (
				<p className="text-green-600 text-sm mt-2">Uploaded: {mutation.data?.filename ?? 'PDF'}, status: {mutation.data?.status}</p>
			)}
			{mutation.isError && <p className="text-red-600 text-sm mt-2">Upload failed.</p>}
		</div>
	)
}


