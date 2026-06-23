# ─────────────────────────────────────────────────────────────
# Dockerfile – Space Defender Gaming App
# Electronic Arts | Azure DevOps CI/CD Project
# ─────────────────────────────────────────────────────────────

# Stage 1: Use official Nginx alpine image (lightweight)
FROM nginx:1.25-alpine

# Set maintainer label
LABEL maintainer="Electronic Arts DevOps Team"
LABEL version="1.0.0"
LABEL description="Space Defender Gaming App – Azure DevOps CI/CD Project"

# Remove default Nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the gaming application files
COPY app/ /usr/share/nginx/html/

# Expose port 80 for HTTP traffic
EXPOSE 80

# Health check to verify the app is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
