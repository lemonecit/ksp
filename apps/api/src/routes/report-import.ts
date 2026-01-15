import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@ksp/database'
import * as XLSX from 'xlsx'

/**
 * KSP REPORT IMPORT
 * 
 * This route handles importing KSP affiliate reports.
 * KSP sends monthly Excel/CSV reports with sales data.
 * We match the UIN (sub-ID) column with our tracking IDs
 * to confirm which clicks resulted in sales.
 */
export const reportImportRoute: FastifyPluginAsync = async (app) => {
  
  app.post('/import', async (request, reply) => {
    const data = await request.file()
    
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' })
    }
    
    // Read the file
    const buffer = await data.toBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet) as any[]
    
    let matchedCount = 0
    let totalRevenue = 0
    
    for (const row of rows) {
      // KSP reports typically have a UIN/Sub-ID column
      // Our UIN format is: AFFILIATE_ID_trackingId
      const uin = row['UIN'] || row['Sub-ID'] || row['uin'] || row['sub_id']
      const commission = parseFloat(row['Commission'] || row['commission'] || row['עמלה'] || 0)
      
      if (!uin) continue
      
      // Extract our tracking ID from the UIN
      // Format: AFFILIATE_ID_trackingId
      const parts = uin.split('_')
      const trackingId = parts[parts.length - 1]
      
      if (!trackingId) continue
      
      // Try to find and update the tracking record
      try {
        const updated = await prisma.revenueTracking.update({
          where: { id: trackingId },
          data: {
            status: 'confirmed',
            commission,
            confirmedAt: new Date()
          }
        })
        
        if (updated) {
          matchedCount++
          totalRevenue += commission
        }
      } catch (e) {
        // Record not found, skip
        app.log.warn({ trackingId, error: 'Tracking ID not found in database' })
      }
    }
    
    // Save import record
    const importRecord = await prisma.reportImport.create({
      data: {
        filename: data.filename,
        totalRows: rows.length,
        matchedRows: matchedCount,
        totalRevenue
      }
    })
    
    return {
      success: true,
      import: importRecord,
      summary: {
        totalRows: rows.length,
        matchedRows: matchedCount,
        unmatchedRows: rows.length - matchedCount,
        totalRevenue
      }
    }
  })
  
  // Get import history
  app.get('/history', async () => {
    const imports = await prisma.reportImport.findMany({
      orderBy: { importedAt: 'desc' },
      take: 50
    })
    return imports
  })
}
