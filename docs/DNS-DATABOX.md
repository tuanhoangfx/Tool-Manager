# DNS — databox.infix1.io.vn → Vercel (P0020-Data-Box)

Production app: **https://databox.infix1.io.vn**  
Cookie Auto tab: **https://databox.infix1.io.vn/cookie**

Vercel project: `tool-manager` (same deployment as P0020-Data-Box).

## Vercel

```powershell
cd E:\Dev\Tool\P0020-Data-Box
vercel domains add databox.infix1.io.vn --scope tuanhoangfxs-projects
```

Dashboard: https://vercel.com/tuanhoangfxs-projects/tool-manager/settings/domains

## Tino DNS (subdomain)

| Loại | Host | Giá trị |
|------|------|---------|
| **A** | `databox` | `76.76.21.21` |

(Vercel khuyến nghị bản ghi **A** cho subdomain `databox` trên Tino.)

## Kiểm tra

```powershell
Resolve-DnsName databox.infix1.io.vn -Type CNAME
Resolve-DnsName databox.infix1.io.vn -Type A

(Invoke-WebRequest -Uri "https://databox.infix1.io.vn/cookie" -UseBasicParsing).StatusCode
# 200
```

## Legacy URL

`https://tool-manager-zeta.vercel.app/?screen=cookie` vẫn hoạt động (extension manifest giữ host cũ).
