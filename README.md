# 우리집 레시피북

누적한 레시피를 검색하고 조리 순서를 확인하는 GitHub Pages용 정적 사이트입니다.

## 배포
1. GitHub에서 `recipe-book`이라는 **Public** 저장소를 만듭니다.
2. ZIP 파일의 압축을 풀고 `recipe-book` 폴더 **안의 파일과 폴더**를 저장소 최상위에 업로드합니다.
3. Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save.
4. 몇 분 뒤 `https://사용자명.github.io/recipe-book/`에서 접속합니다.

## 레시피 추가
`data/recipes.json`에 기존 항목과 같은 구조의 객체를 추가합니다. `id`는 중복되지 않아야 합니다. `youtube`에 유튜브 링크를 넣으면 원본 영상 보기 버튼이 나타납니다. 이미지 대신 이모지 아이콘을 사용합니다.

## 참고
- 영상 원문에서 확인하지 못한 계량이나 순서는 레시피별 참고 메모에 표시합니다.
- 즐겨찾기는 사용 기기 브라우저에만 저장됩니다.
- GitHub Pages는 정적 호스팅입니다. 사이트 자체에서 레시피를 영구 편집하지는 않습니다.
