# MyLoveCat Theme Schema

MyLoveCat은 기본 `자동`, `라이트`, `다크`, `고양이` 테마와 사용자가 가져온 `커스텀` 테마를 지원합니다.

커스텀 테마는 JSON 파일로 가져올 수 있습니다. CSS 문자열이나 외부 URL은 허용하지 않고, 색상 값은 hex color만 허용합니다. 이 제한은 테마 파일을 통한 임의 CSS 주입을 막기 위한 것입니다.

## Schema

```json
{
  "schemaVersion": 1,
  "app": "mylovecat-theme",
  "name": "Mint Kitty",
  "colors": {
    "ink": "#22302d",
    "muted": "#66727a",
    "line": "#dbe7ea",
    "softLine": "#edf4f6",
    "surface": "#ffffff",
    "surface2": "#f0f8f6",
    "base": "#f8fbfb",
    "brand": "#283d3a",
    "brandText": "#ffffff",
    "green": "#168f83",
    "mint": "#74d6c5",
    "coral": "#ff6f91",
    "amber": "#f6bf4f",
    "violet": "#8c73ff"
  }
}
```

## Required Rules

- `schemaVersion` must be `1`.
- `app` must be `mylovecat-theme`.
- `name` must be a non-empty string.
- At least 6 valid color keys are required.
- Color values must be `#RGB` or `#RRGGBB`.
- Unknown keys are ignored.
- CSS functions, gradients, image URLs, and JavaScript URLs are rejected.

## Color Keys

| Key | Usage |
|---|---|
| `ink` | Main text |
| `muted` | Secondary text |
| `line` | Strong border |
| `softLine` | Subtle border |
| `surface` | Panels and controls |
| `surface2` | Secondary panel fill |
| `base` | App background |
| `brand` | Primary buttons and selected controls |
| `brandText` | Text/icon on brand color |
| `green` | Main accent |
| `mint` | Progress and soft accent |
| `coral` | Alerts and warm accent |
| `amber` | Warning accent |
| `violet` | Secondary accent |

## Import

앱에서 `설정 -> 화면 -> 테마 가져오기`를 선택하고 JSON 파일을 업로드합니다. 가져오기에 성공하면 테마가 `커스텀`으로 전환됩니다.

## Export

`설정 -> 화면 -> 테마 내보내기`를 누르면 현재 커스텀 테마 또는 기본 템플릿을 JSON으로 내려받을 수 있습니다.

