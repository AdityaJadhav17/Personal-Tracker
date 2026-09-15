export default function ErrorState() {
  return (
    <section>
      <p>Your data could not be loaded.</p>
      <p>
        Personal Tracker keeps everything in this browser&rsquo;s own storage,
        and this browser will not let the page read it. Site data is probably
        blocked for this address, or this is a private window.
      </p>
      <p>
        Nothing has been lost. Allow site data for this address and reload the
        page.
      </p>
    </section>
  );
}
