'use client'

interface PricePoint {
  price: number
  date: string
}

interface Props {
  data: PricePoint[]
}

export default function PriceHistoryChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500">No price history available</p>
  }
  
  const maxPrice = Math.max(...data.map(d => d.price))
  const minPrice = Math.min(...data.map(d => d.price))
  const range = maxPrice - minPrice || 1
  
  return (
    <div className="h-64 flex items-end gap-1">
      {data.slice(-30).map((point, i) => {
        const height = ((point.price - minPrice) / range) * 100
        return (
          <div 
            key={i}
            className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t transition-colors cursor-pointer group relative"
            style={{ height: `${Math.max(height, 5)}%` }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              ₪{point.price} - {new Date(point.date).toLocaleDateString()}
            </div>
          </div>
        )
      })}
    </div>
  )
}
