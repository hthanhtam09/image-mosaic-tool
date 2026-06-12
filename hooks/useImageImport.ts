'use client'

import type { ColorByNumberGridType } from '@/lib/colorByNumber'
import type { ToolAccess } from '@/lib/tools/access'
import type { VisibilityMap } from '@/lib/featureFlags'
import { useColorByNumberStore } from '@/store/useColorByNumberStore'
import { createThumbnail } from '@/lib/tools/localProjects'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/store/useToastStore'

type DirectImage = { name: string; colorUrl: string; uncolorUrl: string; paletteUrl?: string }

interface UseImageImportOptions {
  access: ToolAccess
  requestPaidAccess: (msg: string) => void
  enabledPatterns: VisibilityMap
  globalGridType: ColorByNumberGridType | 'auto'
  autoCycleIndexRef: React.MutableRefObject<number>
  onImportSuccess?: () => void
}

const allPatterns: ColorByNumberGridType[] = [
  'standard', 'honeycomb', 'diamond', 'pentagon', 'puzzle',
  'islamic', 'fish-scale', 'trapezoid',
]

export function useImageImport({
  access,
  requestPaidAccess,
  enabledPatterns,
  globalGridType,
  autoCycleIndexRef,
  onImportSuccess,
}: UseImageImportOptions) {
  const { addProjects } = useColorByNumberStore()

  const [isConverting, setIsConverting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const [isProcessingFolder, setIsProcessingFolder] = useState(false)
  const [keepImportScreen, setKeepImportScreen] = useState(false)
  const [directImages, setDirectImages] = useState<DirectImage[]>([])
  const [paletteImages, setPaletteImages] = useState<string[]>([])
  const [solutionCollagePages, setSolutionCollagePages] = useState<string[]>([])
  const [uploadedFolders, setUploadedFolders] = useState({ color: false, uncolor: false, palette: false, solutionsCollage: false })

  const imageInputRef = useRef<HTMLInputElement>(null)
  const transparentImageInputRef = useRef<HTMLInputElement>(null)
  const dirInputRef = useRef<HTMLInputElement>(null)
  // Keep a stable ref so memoized handlers always call the latest callback
  const onImportSuccessRef = useRef(onImportSuccess)
  useEffect(() => {
    onImportSuccessRef.current = onImportSuccess
  }, [onImportSuccess])

  const remainingImportSlots = useCallback(
    (projectsLength: number) => Math.max(0, access.maxFilesPerProject - projectsLength),
    [access.maxFilesPerProject]
  )

  const filterAllowedFiles = useCallback(
    (files: File[], projectsLength: number) => {
      const remaining = remainingImportSlots(projectsLength)
      const allowedCount = Math.min(remaining, access.maxFilesPerImport, files.length)
      if (allowedCount < files.length) {
        requestPaidAccess(
          `Your ${access.plan} workspace can import ${access.maxFilesPerImport} image(s) at a time and keep ${access.maxFilesPerProject} image(s) in the current project.`
        )
      }
      return files.slice(0, allowedCount)
    },
    [access.maxFilesPerImport, access.maxFilesPerProject, access.plan, remainingImportSlots, requestPaidAccess]
  )

  const handleImportClick = useCallback(
    (projectsLength: number) => {
      if (isConverting) return
      if (remainingImportSlots(projectsLength) <= 0) {
        requestPaidAccess(`Your ${access.plan} workspace is limited to ${access.maxFilesPerProject} image(s).`)
        return
      }
      setKeepImportScreen(false)
      imageInputRef.current?.click()
    },
    [access.maxFilesPerProject, access.plan, isConverting, remainingImportSlots, requestPaidAccess]
  )

  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, projectsLength: number) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      setIsConverting(true)
      try {
        const fileList = filterAllowedFiles(Array.from(files), projectsLength).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        )
        if (fileList.length === 0) {
          setIsConverting(false)
          return
        }

        setImportProgress({ current: 0, total: fileList.length })
        const patternCycle = allPatterns.filter((p) => enabledPatterns[p] !== false)
        const importedList: { file: File; dataUrl: string; options: { gridType: ColorByNumberGridType } }[] = []

        for (let index = 0; index < fileList.length; index++) {
          const file = fileList[index]
          const dataUrl = await createThumbnail(file)
          const pattern: ColorByNumberGridType =
            globalGridType === 'auto'
              ? patternCycle[autoCycleIndexRef.current++ % patternCycle.length]
              : globalGridType
          importedList.push({ file, dataUrl, options: { gridType: pattern } })
          setImportProgress({ current: index + 1, total: fileList.length })
        }
        addProjects(importedList)
        toast.success(`${fileList.length} image${fileList.length > 1 ? 's' : ''} imported`)
        onImportSuccessRef.current?.()
      } catch (err) {
        console.error('Failed to import images:', err)
        toast.error('Import failed', { description: 'Could not read image files.' })
      } finally {
        setIsConverting(false)
        setImportProgress(null)
        e.target.value = ''
      }
    },
    [enabledPatterns, addProjects, filterAllowedFiles, globalGridType, autoCycleIndexRef]
  )

  const handleImportTransparentClick = useCallback(() => {
    if (!access.canUsePremiumPresets) {
      requestPaidAccess('Object Focus is available on Pro.')
      return
    }
    setKeepImportScreen(true)
    transparentImageInputRef.current?.click()
  }, [access.canUsePremiumPresets, requestPaidAccess])

  const handleTransparentImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, projectsLength: number, setCurrentStep: (s: 1 | 2 | 3) => void) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      setIsConverting(true)
      try {
        const fileList = filterAllowedFiles(Array.from(files), projectsLength).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        )
        if (fileList.length === 0) {
          setIsConverting(false)
          return
        }
        setImportProgress({ current: 0, total: fileList.length })
        const pattern: ColorByNumberGridType = globalGridType === 'hexagon-mark' ? 'hexagon-mark' : 'square-mark'
        const importedList: { file: File; dataUrl: string; options: { id: string; gridType: ColorByNumberGridType; removeBackground: boolean } }[] = []

        for (let index = 0; index < fileList.length; index++) {
          const file = fileList[index]
          const dataUrl = await createThumbnail(file)
          importedList.push({
            file,
            dataUrl,
            options: { id: crypto.randomUUID(), gridType: pattern, removeBackground: true }
          })
          setImportProgress({ current: index + 1, total: fileList.length })
        }
        addProjects(importedList)
        setKeepImportScreen(false)
        setCurrentStep(1)
        toast.success(`${fileList.length} image${fileList.length > 1 ? 's' : ''} imported`)
        onImportSuccessRef.current?.()
      } catch (err) {
        console.error('Failed to import transparent images:', err)
        toast.error('Import failed', { description: 'Could not read image files.' })
      } finally {
        setIsConverting(false)
        setImportProgress(null)
        e.target.value = ''
      }
    },
    [addProjects, filterAllowedFiles, globalGridType]
  )

  const handleDirUploadChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!access.canUseFolderUpload) {
        requestPaidAccess('Folder upload and large batch workflows are available on Pro.')
        e.target.value = ''
        return
      }
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return
      setIsProcessingFolder(true)
      try {
        let hasColor = false, hasUncolor = false, hasPalette = false, hasSolutionsCollage = false
        const groups: Record<string, { color?: File; uncolor?: File; palette?: File }> = {}
        const solutionCollageFiles: File[] = []

        for (const file of files) {
          const relPath = file.webkitRelativePath.toLowerCase()
          const name = file.name
          if (
            relPath.includes('/solutions_collage/') || relPath.startsWith('solutions_collage/') ||
            relPath.includes('/solution_collage/') || relPath.startsWith('solution_collage/')
          ) {
            solutionCollageFiles.push(file); hasSolutionsCollage = true; continue
          }
          if (!groups[name]) groups[name] = {}
          if (relPath.includes('/color/') || relPath.startsWith('color/')) {
            groups[name].color = file; hasColor = true
          } else if (relPath.includes('/uncolor/') || relPath.startsWith('uncolor/')) {
            groups[name].uncolor = file; hasUncolor = true
          } else if (relPath.includes('/palette/') || relPath.startsWith('palette/')) {
            groups[name].palette = file; hasPalette = true
          } else if (relPath.includes('color') || relPath.includes('uncolor') || relPath.includes('palette')) {
            const isColor = relPath.includes('color')
            const isPalette = relPath.includes('palette')
            groups[name][isPalette ? 'palette' : isColor ? 'color' : 'uncolor'] = file
            if (isPalette) hasPalette = true
            else if (isColor) hasColor = true
            else hasUncolor = true
          }
        }

        setUploadedFolders((prev) => ({
          color: prev.color || hasColor, uncolor: prev.uncolor || hasUncolor,
          palette: prev.palette || hasPalette, solutionsCollage: prev.solutionsCollage || hasSolutionsCollage,
        }))

        const readFile = (f: File): Promise<string> => new Promise((resolve, reject) => {
          const rd = new FileReader()
          rd.onload = () => resolve(rd.result as string)
          rd.onerror = reject
          rd.readAsDataURL(f)
        })

        if (solutionCollageFiles.length > 0) {
          const sorted = solutionCollageFiles.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          )
          setSolutionCollagePages(await Promise.all(sorted.map(readFile)))
        }

        const newDirectImages: DirectImage[] = []
        for (const [name, g] of Object.entries(groups)) {
          if (g.uncolor) {
            newDirectImages.push({
              name,
              colorUrl: g.color ? await readFile(g.color) : '',
              uncolorUrl: await readFile(g.uncolor),
              paletteUrl: g.palette ? await readFile(g.palette) : undefined,
            })
          }
        }
        if (newDirectImages.length > 0) {
          setDirectImages((prev) => {
            const filtered = prev.filter((p) => !newDirectImages.some((n) => n.name === p.name))
            const updated = [...filtered, ...newDirectImages].sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            )
            setPaletteImages(updated.map((img) => img.paletteUrl ?? ''))
            return updated
          })
        }
        toast.success('Folder uploaded')
      } catch (err) {
        console.error('Folder upload failed:', err)
        toast.error('Folder upload failed')
      } finally {
        setIsProcessingFolder(false)
        e.target.value = ''
      }
    },
    [access.canUseFolderUpload, requestPaidAccess]
  )

  const removeDirectImage = useCallback((name: string) => {
    setDirectImages((prev) => prev.filter((img) => img.name !== name))
  }, [])

  return {
    isConverting,
    setIsConverting,
    importProgress,
    isProcessingFolder,
    keepImportScreen,
    setKeepImportScreen,
    directImages,
    setDirectImages,
    paletteImages,
    setPaletteImages,
    solutionCollagePages,
    setSolutionCollagePages,
    uploadedFolders,
    setUploadedFolders,
    imageInputRef,
    transparentImageInputRef,
    dirInputRef,
    remainingImportSlots,
    filterAllowedFiles,
    handleImportClick,
    handleImageFileChange,
    handleImportTransparentClick,
    handleTransparentImageFileChange,
    handleDirUploadChange,
    removeDirectImage,
  }
}
