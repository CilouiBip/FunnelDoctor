# Schéma des tables YouTube

## Tables créées

```json
[
  {
    "table_name": "youtube_video_stats"
  },
  {
    "table_name": "youtube_videos"
  }
]
```

## Structure de youtube_videos

```json
[
  {
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "column_name": "video_id",
    "data_type": "text"
  },
  {
    "column_name": "title",
    "data_type": "text"
  },
  {
    "column_name": "description",
    "data_type": "text"
  },
  {
    "column_name": "published_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "thumbnail_url",
    "data_type": "text"
  },
  {
    "column_name": "channel_id",
    "data_type": "text"
  },
  {
    "column_name": "channel_title",
    "data_type": "text"
  },
  {
    "column_name": "duration",
    "data_type": "text"
  },
  {
    "column_name": "tags",
    "data_type": "ARRAY"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  }
]
```

## Structure de youtube_video_stats

```json
[
  {
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "column_name": "video_id",
    "data_type": "uuid"
  },
  {
    "column_name": "view_count",
    "data_type": "integer"
  },
  {
    "column_name": "like_count",
    "data_type": "integer"
  },
  {
    "column_name": "comment_count",
    "data_type": "integer"
  },
  {
    "column_name": "favorite_count",
    "data_type": "integer"
  },
  {
    "column_name": "engagement_rate",
    "data_type": "numeric"
  },
  {
    "column_name": "fetched_at",
    "data_type": "timestamp with time zone"
  }
]
```

## Micro-bloc 1 complété

La migration des tables YouTube a été réalisée avec succès via l'éditeur SQL de Supabase. Les tables `youtube_videos` et `youtube_video_stats` sont maintenant disponibles dans la base de données.
