#!/usr/bin/env python3
"""Convert a user-provided KML/KMZ containing route lines and points to GeoJSON."""

import argparse
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

KML = "http://www.opengis.net/kml/2.2"
MAX_KML_BYTES = 64 * 1024 * 1024


def coordinates(element: ET.Element) -> list[list[float]]:
    text = element.findtext(f"{{{KML}}}coordinates", default="")
    result: list[list[float]] = []
    for token in text.split():
        values = token.split(",")
        if len(values) < 2:
            raise ValueError("Tọa độ KML không đúng định dạng kinh độ, vĩ độ.")
        lon, lat = float(values[0]), float(values[1])
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError("Tọa độ nằm ngoài phạm vi WGS84.")
        result.append([round(lon, 6), round(lat, 6)])
    return result


def convert(source: Path) -> dict:
    with zipfile.ZipFile(source) as archive:
        try:
            entry = archive.getinfo("doc.kml")
        except KeyError as exc:
            raise ValueError("KMZ không có doc.kml.") from exc
        if entry.file_size > MAX_KML_BYTES:
            raise ValueError("KML vượt quá giới hạn 64 MB.")
        root = ET.fromstring(archive.read(entry))

    features: list[dict] = []
    bounds = [180.0, -180.0, 90.0, -90.0]

    def add_feature(placemark: ET.Element, folder: str, geometry: dict, *, point_only: bool = False) -> None:
        coords = geometry["coordinates"]
        flat = [coords] if geometry["type"] == "Point" else coords
        for lon, lat in flat:
            bounds[0] = min(bounds[0], lon)
            bounds[1] = max(bounds[1], lon)
            bounds[2] = min(bounds[2], lat)
            bounds[3] = max(bounds[3], lat)
        source_name = (placemark.findtext(f"{{{KML}}}name", default="") or "").strip()
        name = "" if point_only else source_name
        description = (placemark.findtext(f"{{{KML}}}description", default="") or "").strip()
        features.append({
            "type": "Feature",
            "id": f"kmz-{len(features) + 1:05d}",
            "properties": {
                "name": name,
                "description": "" if description == "0" else description,
                "folder": folder,
                "featureType": "point" if geometry["type"] == "Point" or point_only else "line",
                "sourceName": source_name if point_only else "",
            },
            "geometry": geometry,
        })

    def walk(element: ET.Element, current_folder: str = "") -> None:
        folder = current_folder
        if element.tag == f"{{{KML}}}Folder":
            folder = (element.findtext(f"{{{KML}}}name", default="") or "").strip() or current_folder
        if element.tag == f"{{{KML}}}Placemark":
            for line in element.iter(f"{{{KML}}}LineString"):
                coords = coordinates(line)
                if not coords:
                    raise ValueError("Đoạn tuyến có dưới hai tọa độ.")
                if len(coords) == 1:
                    add_feature(element, folder, {"type": "Point", "coordinates": coords[0]}, point_only=True)
                else:
                    add_feature(element, folder, {"type": "LineString", "coordinates": coords})
            for point in element.iter(f"{{{KML}}}Point"):
                coords = coordinates(point)
                if len(coords) != 1:
                    raise ValueError("Điểm mốc KML phải có đúng một tọa độ.")
                add_feature(element, folder, {"type": "Point", "coordinates": coords[0]})
            return
        for child in list(element):
            walk(child, folder)

    walk(root)
    if not features:
        raise ValueError("Không tìm thấy điểm hoặc đoạn tuyến trong KML.")
    return {
        "type": "FeatureCollection",
        "name": "Tuyến cao tốc và mốc lý trình từ KMZ 12",
        "source": source.name,
        "coordinateReferenceSystem": "WGS84 / EPSG:4326",
        "bbox": bounds,
        "features": features,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Tệp KMZ nguồn")
    parser.add_argument("--output", type=Path, default=Path("public/data/tuyen-cao-toc-12.geojson"))
    args = parser.parse_args()
    result = convert(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    lines = sum(feature["geometry"]["type"] == "LineString" for feature in result["features"])
    points = len(result["features"]) - lines
    print(f"Đã chuyển {lines} đoạn tuyến và {points} điểm mốc sang {args.output}.")
    print(f"Khung tọa độ WGS84: {result['bbox']}; dữ liệu được giữ nguyên, không cắt theo ranh hành chính.")


if __name__ == "__main__":
    main()
