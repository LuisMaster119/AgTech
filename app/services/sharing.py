from urllib.parse import urlencode

import qrcode
from qrcode.image.svg import SvgPathFillImage


def profile_share(base_url: str, farm_id: str) -> dict:
    # Solo codifica el enlace. No consulta servidores externos ni emite credenciales.
    url = base_url.rstrip('/') + '/parcela.html?' + urlencode({'id': farm_id})
    svg = qrcode.make(url, image_factory=SvgPathFillImage, border=4).to_string(encoding='unicode')
    return {'publicUrl': url, 'qrSvg': svg}
